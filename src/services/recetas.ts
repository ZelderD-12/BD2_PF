import { sql, getConnection } from '../Connetion';
import type { Context } from 'elysia';

// =============================================
// 1. OBTENER DATOS DE UNA CITA (para cabecera)
// =============================================
export const obtenerCitaPorId = async ({ params, set }: Context) => {
    const { id } = params as { id: string };
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id_cita', sql.SmallInt, parseInt(id))
            .query(`
                SELECT
                    c.id_cita,
                    c.fecha_inicio,
                    c.__estado__                                   AS estado,
                    c.motivo_consulta,
                    c.id_paciente,
                    pac.__nombres__ + ' ' + pac.__apellidos__      AS paciente_nombre,
                    c.id_medico,
                    med_u.__nombres__ + ' ' + med_u.__apellidos__  AS medico_nombre,
                    med.numero_colegiado,
                    s.__nombre__                                    AS servicio
                FROM dbo.Cita c
                INNER JOIN dbo.ususarios  pac   ON c.id_paciente  = pac.id_usuario
                INNER JOIN dbo.medicos    med   ON c.id_medico    = med.id_medico
                INNER JOIN dbo.ususarios  med_u ON med.id_usuario = med_u.id_usuario
                INNER JOIN dbo.servicios  s     ON c.id_servicio  = s.id_servicio
                WHERE c.id_cita = @id_cita
            `);

        if (!result.recordset.length) {
            set.status = 404;
            return { success: false, error: 'Cita no encontrada' };
        }
        return { success: true, data: result.recordset[0] };
    } catch (error) {
        console.error('Error en obtenerCitaPorId:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 2. LISTAR MEDICAMENTOS (autocomplete)
// =============================================
export const listarMedicamentos = async ({ query, set }: Context) => {
    const { filtro } = query as { filtro?: string };
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('filtro', sql.VarChar(100), filtro || null)
            .execute('dbo.SP_Medicamento_Listar');
        return { success: true, data: result.recordset };
    } catch (error) {
        console.error('Error en listarMedicamentos:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 3. INSERTAR MEDICAMENTO AL CATÁLOGO
// =============================================
export const insertarMedicamento = async ({ body, set }: Context) => {
    const { nombre } = body as { nombre: string };
    if (!nombre || !nombre.trim()) {
        set.status = 422;
        return { success: false, error: 'El nombre del medicamento es requerido' };
    }
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('nombre',         sql.VarChar(200), nombre.trim())
            .output('id_medicamento', sql.SmallInt)
            .execute('dbo.SP_Medicamento_Insertar');
        set.status = 201;
        return {
            success: true,
            data: { id_medicamento: result.output.id_medicamento, nombre: nombre.trim() }
        };
    } catch (error) {
        console.error('Error en insertarMedicamento:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 4. CREAR RECETA (primera línea → devuelve Orden_Receta)
// =============================================
export const crearReceta = async ({ body, set }: Context) => {
    const { id_cita, id_medicamento, observaciones } = body as {
        id_cita: number;
        id_medicamento: number;
        observaciones?: string;
    };
    if (!id_cita || !id_medicamento) {
        set.status = 422;
        return { success: false, error: 'id_cita e id_medicamento son requeridos' };
    }
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id_cita',        sql.SmallInt,     id_cita)
            .input('id_medicamento', sql.SmallInt,     id_medicamento)
            .input('observaciones',  sql.VarChar(500), observaciones || null)
            .output('Orden_Receta',  sql.VarChar(30))
            .execute('dbo.SP_Receta_Crear');
        set.status = 201;
        return { success: true, data: { Orden_Receta: result.output.Orden_Receta } };
    } catch (error) {
        console.error('Error en crearReceta:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 5. AGREGAR LÍNEA A RECETA EXISTENTE
// =============================================
export const agregarLineaReceta = async ({ params, body, set }: Context) => {
    const { orden } = params as { orden: string };
    const { id_medicamento, observaciones } = body as {
        id_medicamento: number;
        observaciones?: string;
    };
    if (!id_medicamento) {
        set.status = 422;
        return { success: false, error: 'id_medicamento es requerido' };
    }
    try {
        const pool = await getConnection();
        await pool.request()
            .input('Orden_Receta',   sql.VarChar(30),  orden)
            .input('id_medicamento', sql.SmallInt,      id_medicamento)
            .input('observaciones',  sql.VarChar(500),  observaciones || null)
            .execute('dbo.SP_Receta_AgregarLinea');
        return { success: true };
    } catch (error) {
        console.error('Error en agregarLineaReceta:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 6. CONSULTAR RECETA COMPLETA POR ORDEN
// =============================================
export const consultarReceta = async ({ params, set }: Context) => {
    const { orden } = params as { orden: string };
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('Orden_Receta', sql.VarChar(30), orden)
            .execute('dbo.SP_Receta_Consultar');
        return { success: true, data: result.recordset };
    } catch (error) {
        console.error('Error en consultarReceta:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 7. HISTORIAL DE RECETAS POR PACIENTE
// =============================================
export const recetasPorPaciente = async ({ params, set }: Context) => {
    const { id } = params as { id: string };
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id_paciente', sql.SmallInt, parseInt(id))
            .execute('dbo.SP_Receta_PorPaciente');
        return { success: true, data: result.recordset };
    } catch (error) {
        console.error('Error en recetasPorPaciente:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};

// =============================================
// 8. ANULAR LÍNEA DE RECETA
// =============================================
export const anularLineaReceta = async ({ params, set }: Context) => {
    const { id_receta } = params as { id_receta: string };
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id_receta', sql.Int, parseInt(id_receta))
            .execute('dbo.SP_Receta_Anular');
        return { success: true };
    } catch (error) {
        console.error('Error en anularLineaReceta:', error);
        set.status = 500;
        return { success: false, error: 'Error interno del servidor' };
    }
};
