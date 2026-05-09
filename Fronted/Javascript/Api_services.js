// Javascript/Api_services.js
const API_URL = 'http://localhost:8080';

const api = {
    // =============================================
    // AUTENTICACIÓN
    // =============================================
    async login(email, password) {
        try {
            const response = await fetch(`${API_URL}/Login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('Respuesta login:', data);
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('id_usuario', data.usuario.id);
                localStorage.setItem('user_email', data.usuario.email);
                localStorage.setItem('user_nombre', `${data.usuario.nombres} ${data.usuario.apellidos}`);
                localStorage.setItem('user_rol', data.usuario.rol);
            }
            
            return data;
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error de conexión' };
        }
    },

    // =============================================
    // PAGOS A FAMKON (usando email/telefono)
    // =============================================
    
    async obtenerSaldo(email, telefono) {
        try {
            let url = `${API_URL}/pagos/saldo?`;
            if (email) url += `email=${encodeURIComponent(email)}`;
            if (telefono) url += `telefono=${encodeURIComponent(telefono)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al obtener saldo:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async pagarConTarjeta(datosPago) {
        try {
            const idempotencyKey = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substring(7);

            const response = await fetch(`${API_URL}/pagos/tarjeta`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify({
                    email: datosPago.email,
                    telefono: datosPago.telefono,
                    numero_tarjeta: datosPago.numero_tarjeta,
                    nombre_titular: datosPago.nombre_titular,
                    fecha_expiracion: datosPago.fecha_expiracion,
                    cvv: datosPago.cvv,
                    monto: datosPago.monto,
                    concepto: datosPago.concepto,
                    id_cita: datosPago.id_cita || null,
                    id_servicio: datosPago.id_servicio || null
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error en pago con tarjeta:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async pagarConTransferencia(datosPago) {
        try {
            const idempotencyKey = 'TRF_' + Date.now() + '_' + Math.random().toString(36).substring(7);

            const response = await fetch(`${API_URL}/pagos/transferencia`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify({
                    email: datosPago.email,
                    telefono: datosPago.telefono,
                    numero_cuenta: datosPago.numero_cuenta,
                    monto: datosPago.monto,
                    concepto: datosPago.concepto,
                    id_cita: datosPago.id_cita || null,
                    id_servicio: datosPago.id_servicio || null
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error en transferencia:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async obtenerHistorial(email, telefono, limite = 20, offset = 0) {
        try {
            let url = `${API_URL}/pagos/historial?limite=${limite}&offset=${offset}`;
            if (email) url += `&email=${encodeURIComponent(email)}`;
            if (telefono) url += `&telefono=${encodeURIComponent(telefono)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al obtener historial:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async obtenerDetallePago(id, email, telefono) {
        try {
            let url = `${API_URL}/pagos/detalle/${id}?`;
            if (email) url += `email=${encodeURIComponent(email)}`;
            if (telefono) url += `telefono=${encodeURIComponent(telefono)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al obtener detalle:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async verificarConexion() {
        try {
            const response = await fetch(`${API_URL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Error al verificar conexión:', error);
            return { status: 'ERROR' };
        }
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('id_usuario');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_nombre');
        localStorage.removeItem('user_rol');
        window.location.href = '../../FamKon_Clinic.html';
    },

    // =============================================
    // RECETAS MÉDICAS
    // =============================================

    async obtenerCita(idCita) {
        try {
            const response = await fetch(`${API_URL}/api/cita/${idCita}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al obtener cita:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async listarMedicamentos(filtro) {
        try {
            const url = filtro
                ? `${API_URL}/api/medicamentos?filtro=${encodeURIComponent(filtro)}`
                : `${API_URL}/api/medicamentos`;
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al listar medicamentos:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async insertarMedicamento(nombre) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/medicamentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ nombre })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al insertar medicamento:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async crearReceta(idCita, idMedicamento, observaciones) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/recetas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    id_cita: idCita,
                    id_medicamento: idMedicamento,
                    observaciones: observaciones || null
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al crear receta:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async agregarLineaReceta(orden, idMedicamento, observaciones) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/recetas/${encodeURIComponent(orden)}/lineas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    id_medicamento: idMedicamento,
                    observaciones: observaciones || null
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error al agregar línea:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async consultarReceta(orden) {
        try {
            const response = await fetch(`${API_URL}/api/recetas/${encodeURIComponent(orden)}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al consultar receta:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async recetasPorPaciente(idPaciente) {
        try {
            const response = await fetch(`${API_URL}/api/pacientes/${idPaciente}/recetas`, {
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al obtener historial:', error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    async anularLineaReceta(idReceta) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/recetas/linea/${idReceta}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Error al anular línea:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }
};

window.api = api;