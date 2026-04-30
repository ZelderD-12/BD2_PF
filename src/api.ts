// api.ts
import dotenv from 'dotenv';
dotenv.config();

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { login, crearUsuario, actualizarUsuario, obtenerUsuario } from './Controlles/usuarios';

const app = new Elysia();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/', () => ({
    message: 'API de Clinica funcionando',
    version: '1.0.0',
    endpoints: {
        login: 'POST /Login',
        crear_usuario: 'POST /Usuario/crear',
        actualizar_usuario: 'PUT /Usuario/actualizar',
        obtener_usuario: 'GET /Usuario/:id'
    }
}));

app.get('/health', () => ({
    status: 'OK',
    timestamp: new Date().toISOString()
}));

app.post('/Login', login);
app.post('/Usuario/crear', crearUsuario);
app.put('/Usuario/actualizar', actualizarUsuario);
app.get('/Usuario/:id', obtenerUsuario);

const port = parseInt(process.env.APP_PORT || '8080');
app.listen(port);

console.log(`\n API corriendo en http://localhost:${port}`);