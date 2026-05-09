import dotenv from 'dotenv';
dotenv.config();

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { login, crearUsuario, actualizarUsuario, obtenerUsuario } from './Controlles/usuarios';
import { 
    pagarConTarjeta,
    pagarConTransferencia,
    consultarSaldo, 
    obtenerHistorial, 
    obtenerDetallePago 
} from './services/transferencias';

import {
    reservarCitaService,
    obtenerCitasPaciente,
    obtenerServicios,
    obtenerMedicos
} from './services/citas';

import {
    generarTicketService,
    llamarSiguienteService,
    cambiarEstadoTicketService,
    obtenerColaPublicaService
} from './services/tickets';

import {
    obtenerCitaPorId,
    listarMedicamentos,
    insertarMedicamento,
    crearReceta,
    agregarLineaReceta,
    consultarReceta,
    recetasPorPaciente,
    anularLineaReceta
} from './services/recetas';

const app = new Elysia();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));

// Health check
app.get('/', () => ({
    message: 'API de Clinica funcionando',
    version: '2.0.0'
}));

app.get('/health', () => ({
    status: 'OK',
    timestamp: new Date().toISOString()
}));

// Usuarios
app.post('/Login', login);
app.post('/Usuario/crear', crearUsuario);
app.put('/Usuario/actualizar', actualizarUsuario);
app.get('/Usuario/:id', obtenerUsuario);

// =============================================
// PAGOS A FAMKON (usando email/telefono)
// =============================================

// Pago con tarjeta
app.post('/pagos/tarjeta', pagarConTarjeta);

// Pago con transferencia bancaria
app.post('/pagos/transferencia', pagarConTransferencia);

// Consultar saldo (por email o telefono)
app.get('/pagos/saldo', consultarSaldo);

// Obtener historial de pagos
app.get('/pagos/historial', obtenerHistorial);

// Obtener detalle de un pago
app.get('/pagos/detalle/:id', obtenerDetallePago);


app.post('/api/reservar/cita',      reservarCitaService);
app.get('/api/citas/paciente/:id',  obtenerCitasPaciente);
app.get('/api/citas/servicios',     obtenerServicios);
app.get('/api/citas/medicos',       obtenerMedicos);

// Tickets y cola de recepcion
app.post('/api/tickets/generar',         generarTicketService);
app.post('/api/tickets/siguiente',       llamarSiguienteService);
app.post('/api/tickets/:id/estado',      cambiarEstadoTicketService);
app.get('/api/pantalla/cola',            obtenerColaPublicaService);

// Recetas médicas
app.get('/api/cita/:id',                    obtenerCitaPorId);
app.get('/api/medicamentos',                listarMedicamentos);
app.post('/api/medicamentos',               insertarMedicamento);
app.post('/api/recetas',                    crearReceta);
app.post('/api/recetas/:orden/lineas',      agregarLineaReceta);
app.get('/api/recetas/:orden',              consultarReceta);
app.get('/api/pacientes/:id/recetas',       recetasPorPaciente);
app.delete('/api/recetas/linea/:id_receta', anularLineaReceta);

const port = parseInt(process.env.APP_PORT || '8080');
app.listen(port);

console.log(`\n API Clinica FamKon corriendo en http://localhost:${port}`);
