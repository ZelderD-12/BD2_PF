// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

import { Elysia } from 'elysia';
import { getConnection, sql } from './Connetion';

const app = new Elysia();

const port = parseInt(process.env.APP_PORT || '8080');
app.listen(port);

console.log(` API corriendo en http://localhost:${port}`);

// Endpoint raíz
app.get('/', () => ({
    message: ' API de Clínica funcionando',
}));





