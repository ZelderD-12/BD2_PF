"""
============================================================
 Clínica Integral — Módulo "Crear Nueva Cita"
 Endpoints FastAPI + integración con SQL Server (vía pyodbc)
============================================================

Endpoints implementados (todos bajo /api):
  GET  /api/sedes
  GET  /api/especialidades?sede_id=
  GET  /api/medicos?especialidad_id=&sede_id=
  GET  /api/slots?medico_id=&fecha=&especialidad_id=
  POST /api/reservar/cita
  POST /api/reservar/cita/{cita_id}/confirmar

Convenciones (ver Sección 4 del PDF del proyecto):
  - Auth Bearer JWT
  - JSON request/response
  - Header obligatorio: Idempotency-Key (UUID) en POST críticos
  - Códigos: 201/200 éxito; 409 conflicto; 422 regla de negocio;
            401/403 seguridad

Reglas de negocio críticas (Sección 5.1) están implementadas
en los STORED PROCEDURES (ver citas_sp.sql). Este archivo es
una capa fina de orquestación: NO contiene lógica de reserva.
"""

from __future__ import annotations

import os
import time
import uuid
import logging
from datetime import date, datetime
from typing import Optional, Annotated

import pyodbc
from fastapi import (
    APIRouter, Depends, Header, HTTPException, Query, status, Request
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

# ------------------------------------------------------------------
# Configuración
# ------------------------------------------------------------------
log = logging.getLogger("citas")
router = APIRouter(prefix="/api", tags=["Citas"])
bearer = HTTPBearer(auto_error=True)

DB_CONN = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={os.getenv('DB_SERVER','localhost')};"
    f"DATABASE={os.getenv('DB_NAME','ClinicaIntegral')};"
    f"UID={os.getenv('DB_USER','sa')};"
    f"PWD={os.getenv('DB_PASSWORD','YourStrong!Pass')};"
    f"TrustServerCertificate=yes;"
)

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-please")

# ------------------------------------------------------------------
# Excepción tipada del proyecto
# ------------------------------------------------------------------
class APIError(HTTPException):
    """
    Wrapper para respuestas tipo:
        {"code": "SIN_CUPO", "message": "...", "detail": {...}}
    """
    def __init__(self, status_code: int, code: str, message: str,
                 detail: Optional[dict] = None):
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message, "detail": detail or {}},
        )

# ------------------------------------------------------------------
# Auth (JWT mínimo — en producción usar python-jose)
# ------------------------------------------------------------------
class CurrentUser(BaseModel):
    id: int
    nombre: str
    rol: str   # PACIENTE | RECEPCION | MEDICO | SUPERVISOR | AUDITOR | ADMIN

def _decode_jwt_stub(token: str) -> CurrentUser:
    """
    Stub: en producción validar firma con JWT_SECRET y extraer claims.
    Aquí simulamos un paciente autenticado.
    """
    if not token or token == "expired":
        raise APIError(401, "TOKEN_INVALIDO", "Token inválido o expirado")
    return CurrentUser(id=42, nombre="Abigail Flores", rol="PACIENTE")

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> CurrentUser:
    return _decode_jwt_stub(creds.credentials)

def require_role(*roles: str):
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.rol not in roles:
            raise APIError(403, "ROL_INSUFICIENTE",
                           f"Tu rol '{user.rol}' no permite esta operación")
        return user
    return _checker

# ------------------------------------------------------------------
# Helpers de BD con retry para deadlock victim (Sección 6.2)
# ------------------------------------------------------------------
def _connect():
    return pyodbc.connect(DB_CONN, autocommit=False)

def db_call(sp_name: str, params: list, retries: int = 3) -> list[dict]:
    """
    Ejecuta un SP con retry para SQLState 40001 (deadlock).
    Devuelve la primera result-set como list[dict].
    """
    last_exc = None
    for attempt in range(retries):
        try:
            with _connect() as conn:
                cur = conn.cursor()
                placeholders = ",".join(["?"] * len(params))
                cur.execute(f"{{CALL {sp_name}({placeholders})}}", *params)
                rows = []
                if cur.description:
                    cols = [c[0] for c in cur.description]
                    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
                conn.commit()
                return rows
        except pyodbc.Error as ex:
            sqlstate = ex.args[0] if ex.args else ""
            last_exc = ex
            # 40001 = deadlock victim; reintentamos con backoff
            if sqlstate == "40001" and attempt < retries - 1:
                wait = 0.05 * (2 ** attempt)  # 50ms, 100ms, 200ms
                log.warning("Deadlock en %s, retry %d en %.0fms",
                            sp_name, attempt + 1, wait * 1000)
                time.sleep(wait)
                continue
            raise
    raise last_exc  # type: ignore

# ------------------------------------------------------------------
# Idempotency-Key (Sección 6.2)
# ------------------------------------------------------------------
def get_idempotency_key(
    idem_key: Annotated[Optional[str], Header(alias="Idempotency-Key")] = None
) -> str:
    """
    Header obligatorio en POST críticos. Validamos que sea UUID v4.
    El SP debe verificar si ya existe una operación con esta clave
    y devolver el resultado original (idempotente).
    """
    if not idem_key:
        raise APIError(422, "IDEMPOTENCY_KEY_REQUERIDA",
                       "Header 'Idempotency-Key' (UUID) es obligatorio")
    try:
        uuid.UUID(idem_key, version=4)
    except (ValueError, AttributeError):
        raise APIError(422, "IDEMPOTENCY_KEY_INVALIDA",
                       "Idempotency-Key debe ser un UUID v4 válido")
    return idem_key

# ==================================================================
#  SCHEMAS Pydantic
# ==================================================================
class SedeOut(BaseModel):
    id: int
    nombre: str
    ciudad: str
    direccion: str | None = None

class EspecialidadOut(BaseModel):
    id: int
    nombre: str
    duracion_slot_min: int

class MedicoOut(BaseModel):
    id: int
    nombre: str
    especialidad_id: int
    anios_experiencia: int

class SlotOut(BaseModel):
    hora: str                       # "08:00"
    capacidad: int
    reservados: int
    disponibles: int

class ReservarCitaIn(BaseModel):
    sede_id: int = Field(..., gt=0)
    especialidad_id: int = Field(..., gt=0)
    medico_id: Optional[int] = Field(None, ge=0)  # 0/None = cualquier disponible
    fecha: date
    hora: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    motivo: Optional[str] = Field(None, max_length=500)

    @field_validator("fecha")
    @classmethod
    def _no_pasada(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("La fecha no puede ser pasada")
        return v

class ReservarCitaOut(BaseModel):
    cita_id: int
    estado: str           # PENDIENTE
    codigo: str           # C-AB12X
    expira_en_min: int    # 10
    fecha: date
    hora: str

class ConfirmarCitaOut(BaseModel):
    cita_id: int
    estado: str           # CONFIRMADA

# ==================================================================
#  ENDPOINTS — Lecturas (cargan vistas del wizard)
# ==================================================================

@router.get("/sedes", response_model=list[SedeOut])
def get_sedes(_: CurrentUser = Depends(get_current_user)):
    """Lista de sedes activas. Usado en el step 1 del wizard."""
    rows = db_call("dbo.sp_GetSedesActivas", [])
    return [SedeOut(**r) for r in rows]


@router.get("/especialidades", response_model=list[EspecialidadOut])
def get_especialidades(
    sede_id: int = Query(..., gt=0),
    _: CurrentUser = Depends(get_current_user),
):
    """Especialidades disponibles en la sede dada. Step 2."""
    rows = db_call("dbo.sp_GetEspecialidadesPorSede", [sede_id])
    return [EspecialidadOut(**r) for r in rows]


@router.get("/medicos", response_model=list[MedicoOut])
def get_medicos(
    especialidad_id: int = Query(..., gt=0),
    sede_id: Optional[int] = Query(None, gt=0),
    _: CurrentUser = Depends(get_current_user),
):
    """Médicos para la especialidad (filtrado opcional por sede). Step 3."""
    rows = db_call("dbo.sp_GetMedicosPorEspecialidad",
                   [especialidad_id, sede_id])
    return [MedicoOut(**r) for r in rows]


@router.get("/slots", response_model=list[SlotOut])
def get_slots(
    fecha: date,
    especialidad_id: int = Query(..., gt=0),
    sede_id: int = Query(..., gt=0),
    medico_id: Optional[int] = Query(None, ge=0),
    _: CurrentUser = Depends(get_current_user),
):
    """
    Slots disponibles en la fecha. Step 5.
    El SP debe calcular capacidad - reservados confirmados/pendientes.
    """
    rows = db_call("dbo.sp_GetSlotsDisponibles",
                   [fecha, especialidad_id, sede_id, medico_id])
    return [SlotOut(**r) for r in rows]


# ==================================================================
#  ENDPOINTS — Operaciones críticas (Gates G1)
# ==================================================================

@router.post(
    "/reservar/cita",
    response_model=ReservarCitaOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "Sin cupo o duplicado"},
        422: {"description": "Regla de negocio violada"},
    },
)
def reservar_cita(
    body: ReservarCitaIn,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    idem_key: str = Depends(get_idempotency_key),
):
    """
    Crea una cita en estado PENDIENTE.
    Toda la lógica crítica (capacidad, max activas, ventana mínima,
    constraint único anti-overbook) vive en sp_ReservarCita.

    El SP devuelve un código de resultado:
       0  -> OK (201)
       1  -> SIN_CUPO (409)
       2  -> DUPLICADO_IDEMPOTENCIA (devuelve cita previa con 200)
       3  -> MAX_CITAS_ACTIVAS (422)
       4  -> FUERA_DE_VENTANA (422)
       5  -> SLOT_INVALIDO (422)
    """
    log.info("reservar_cita user=%s idem=%s body=%s",
             user.id, idem_key, body.model_dump())

    rows = db_call("dbo.sp_ReservarCita", [
        user.id,                # @paciente_id
        body.sede_id,
        body.especialidad_id,
        body.medico_id,
        body.fecha,
        body.hora,
        body.motivo,
        idem_key,
    ])
    if not rows:
        raise APIError(500, "SP_SIN_RESPUESTA",
                       "El stored procedure no devolvió resultado")

    r = rows[0]
    code = int(r["resultado"])

    if code == 0 or code == 2:
        # 2 = idempotente: devolvemos la cita ya creada con el mismo key
        return ReservarCitaOut(
            cita_id=r["cita_id"],
            estado=r["estado"],
            codigo=r["codigo"],
            expira_en_min=r.get("expira_en_min", 10),
            fecha=body.fecha,
            hora=body.hora,
        )
    if code == 1:
        raise APIError(409, "SIN_CUPO",
                       "El horario seleccionado ya no tiene cupo disponible")
    if code == 3:
        raise APIError(422, "MAX_CITAS_ACTIVAS",
                       "Ya tienes el máximo de citas activas en esta especialidad")
    if code == 4:
        raise APIError(422, "FUERA_DE_VENTANA",
                       "No puedes agendar con menos de la ventana mínima permitida")
    if code == 5:
        raise APIError(422, "SLOT_INVALIDO",
                       "El slot/hora seleccionado no es válido")
    raise APIError(500, "RESULTADO_DESCONOCIDO",
                   f"Código de resultado no manejado: {code}")


@router.post(
    "/reservar/cita/{cita_id}/confirmar",
    response_model=ConfirmarCitaOut,
)
def confirmar_cita(
    cita_id: int,
    user: CurrentUser = Depends(get_current_user),
    idem_key: str = Depends(get_idempotency_key),
):
    """
    Pasa una cita PENDIENTE -> CONFIRMADA.
    SP retorna:
       0 -> OK
       6 -> CITA_NO_PERTENECE (403)
       7 -> CITA_EXPIRADA / NO_PENDIENTE (409)
    """
    rows = db_call("dbo.sp_ConfirmarCita",
                   [cita_id, user.id, idem_key])
    if not rows:
        raise APIError(500, "SP_SIN_RESPUESTA",
                       "El stored procedure no devolvió resultado")

    r = rows[0]
    code = int(r["resultado"])

    if code == 0:
        return ConfirmarCitaOut(cita_id=cita_id, estado="CONFIRMADA")
    if code == 6:
        raise APIError(403, "CITA_NO_PERTENECE",
                       "Esta cita no te pertenece")
    if code == 7:
        raise APIError(409, "ESTADO_INVALIDO",
                       "La cita ya no se puede confirmar (expirada o estado distinto a PENDIENTE)")
    raise APIError(500, "RESULTADO_DESCONOCIDO",
                   f"Código de resultado no manejado: {code}")


# ==================================================================
#  Bootstrap (para correr standalone con: uvicorn citas_api:app)
# ==================================================================
def create_app():
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(
        title="Clínica Integral — Citas",
        version="1.0.0",
        description="Endpoints para crear nueva cita (Proyecto Final BD2)",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app

app = create_app()
