// Javascript/Api_services.js
const API_URL = 'http://localhost:8080';

const api = {
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
            return data;
            
        } catch (error) {
            console.error('Error en login:', error);
            return { 
                success: false, 
                message: 'Error de conexión con el servidor',
                code: 'ERROR_CONEXION'
            };
        }
    },

    async crearUsuario(usuarioData) {
        try {
            const response = await fetch(`${API_URL}/Usuario/crear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(usuarioData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error al crear usuario:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }
};

window.api = api;