// FamKon_Clinic.js - Global simplificado

document.addEventListener('DOMContentLoaded', async function() {
    await cargarLayouts();
    verificarSesionGlobal();
    configurarBotonesGlobales();
});

async function cargarLayouts() {
    try {
        const headerResp = await fetch('./layouts/header.html');
        document.getElementById('header').innerHTML = await headerResp.text();
        
        const navResp = await fetch('./layouts/nav.html');
        document.getElementById('nav').innerHTML = await navResp.text();
        
        const footerResp = await fetch('./layouts/footer.html');
        document.getElementById('footer').innerHTML = await footerResp.text();
        
        setTimeout(() => {
            verificarSesionGlobal();
            configurarBotonesGlobales();
        }, 100);
        
    } catch (error) {
        console.error('Error cargando layouts:', error);
    }
}

function configurarBotonesGlobales() {
    var btnAgendar = document.getElementById('btnAgendarCita');
    if (btnAgendar) {
        btnAgendar.addEventListener('click', function(e) {
            e.preventDefault();
            if (localStorage.getItem('auth_token')) {
                window.location.href = './pages/citas/citas.html';
            } else {
                window.location.href = '../../Fronted/pages/login/login.html';
            }
        });
    }
    
    var navCitas = document.getElementById('navCitasSimple');
    if (navCitas) {
        navCitas.addEventListener('click', function(e) {
            e.preventDefault();
            if (localStorage.getItem('auth_token')) {
                window.location.href = './pages/citas/citas.html';
            } else {
                window.location.href = '../../Fronted/pages/login/login.html';
            }
        });
    }
    
    var navPagar = document.getElementById('navPagarSimpleLink');
    if (navPagar) {
        navPagar.addEventListener('click', function(e) {
            e.preventDefault();
            if (localStorage.getItem('auth_token')) {
                window.location.href = './pages/pagar/pagar.html';
            } else {
                window.location.href = '../../Fronted/pages/login/login.html';
            }
        });
    }
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesionGlobal();
        });
    }
}

function verificarSesionGlobal() {
    var token = localStorage.getItem('auth_token');
    var userName = localStorage.getItem('user_nombre');
    
    var btnLogin = document.getElementById('btnLoginHeader');
    var userInfo = document.getElementById('userInfoHeader');
    var userNameSpan = document.getElementById('userNameHeader');
    var navPagarItem = document.getElementById('navPagarSimple');
    var logoutBtn = document.getElementById('logoutBtn');
    
    if (token && userName) {
        if (btnLogin) btnLogin.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (userNameSpan) userNameSpan.textContent = '👤 ' + userName;
        if (navPagarItem) navPagarItem.style.display = 'list-item';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        if (btnLogin) btnLogin.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (navPagarItem) navPagarItem.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

function inicializarSecciones() {
    var secciones = document.querySelectorAll('section');
    for (var i = 0; i < secciones.length; i++) {
        secciones[i].style.display = 'none';
    }
    var inicioSection = document.getElementById('inicio');
    if (inicioSection) inicioSection.style.display = 'block';
}

function cerrarSesionGlobal() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_nombre');
    localStorage.removeItem('user_rol');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    window.location.href = 'FamKon_Clinic.html';
}

inicializarSecciones();