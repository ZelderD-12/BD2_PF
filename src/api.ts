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
const port = parseInt(process.env.APP_PORT || '8080');
app.listen(port);

console.log(`\n API Clinica FamKon corriendo en http://localhost:${port}`);
