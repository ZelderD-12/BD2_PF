// login.js - Version mejorada con manejo de mensajes del SP
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('loginMessage');
const togglePassword = document.getElementById('togglePassword');

const API_URL = 'http://localhost:8080';

if (togglePassword) {
    togglePassword.addEventListener('click', function() {
        const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassword.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

function showMessage(message, type) {
    if (!loginMessage) return;
    loginMessage.textContent = message;
    loginMessage.className = 'form-message ' + type;
    loginMessage.style.display = 'block';
    setTimeout(function() {
        if (loginMessage) loginMessage.style.display = 'none';
    }, 5000);
}

async function iniciarSesion(email, password) {
    var originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    loginBtn.disabled = true;
    
    try {
        var response = await fetch(API_URL + '/Login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, password: password })
        });
        
        var result = await response.json();
        
        if (result.success === true && result.token) {
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_nombre', (result.usuario && result.usuario.nombres) || email.split('@')[0]);
            localStorage.setItem('user_rol', (result.usuario && result.usuario.rol_nombre) || 'PACIENTE');
            localStorage.setItem('user_email', email);
            localStorage.setItem('user_id', (result.usuario && result.usuario.id) || '');
            
            showMessage((result.message || 'Sesion iniciada correctamente') + ' Redirigiendo...', 'success');
            
            setTimeout(function() {
                window.location.href = '../../FamKon_Clinic.html';
            }, 1500);
            
            return true;
        }
        
        var mensajeError = result.message || 'Error al iniciar sesion';
        
        if (result.code === 'USUARIO_NO_ENCONTRADO') {
            mensajeError = 'No existe una cuenta con este correo electronico. ¿Deseas registrarte?';
        } else if (result.code === 'CONTRASENA_INCORRECTA') {
            mensajeError = 'Contraseña incorrecta. Por favor verifica tu contraseña.';
        } else if (result.code === 'CUENTA_BLOQUEADA') {
            mensajeError = result.message || 'Cuenta bloqueada por muchos intentos fallidos. Intenta mas tarde.';
        } else if (result.code === 'DEMASIADOS_INTENTOS') {
            mensajeError = result.message || 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.';
        }
        
        showMessage(mensajeError, 'error');
        return false;
        
    } catch (error) {
        console.error('Error en login:', error);
        showMessage('Error de conexion con el servidor. Verifica que la API este corriendo.', 'error');
        return false;
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var email = loginEmail.value.trim();
        var password = loginPassword.value.trim();
        
        if (!email) {
            showMessage('Ingresa tu correo electronico', 'error');
            loginEmail.focus();
            return;
        }
        
        if (!password) {
            showMessage('Ingresa tu contraseña', 'error');
            loginPassword.focus();
            return;
        }
        
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('Ingresa un correo electronico valido', 'error');
            loginEmail.focus();
            return;
        }
        
        await iniciarSesion(email, password);
    });
}

if (loginPassword) {
    loginPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && loginForm) {
            e.preventDefault();
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var token = localStorage.getItem('auth_token');
    if (token) {
        showMessage('Ya tienes una sesion activa. Redirigiendo...', 'success');
        setTimeout(function() {
            window.location.href = '../../FamKon_Clinic.html';
        }, 1500);
    }
});