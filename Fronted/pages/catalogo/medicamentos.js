var listaMeds = [];

// =============================================
// LAYOUTS + AUTH
// =============================================
async function cargarLayouts() {
    try {
        var h = await fetch('../../layouts/header.html');
        document.getElementById('header').innerHTML = await h.text();
        var n = await fetch('../../layouts/nav.html');
        document.getElementById('nav').innerHTML = await n.text();
        var f = await fetch('../../layouts/footer.html');
        document.getElementById('footer').innerHTML = await f.text();
        setTimeout(function() {
            var token  = localStorage.getItem('auth_token');
            var nombre = localStorage.getItem('user_nombre');
            var btnLogin = document.getElementById('btnLoginHeader');
            var userInfo = document.getElementById('userInfoHeader');
            var userSpan = document.getElementById('userNameHeader');
            if (token && nombre) {
                if (btnLogin) btnLogin.style.display = 'none';
                if (userInfo) userInfo.style.display = 'flex';
                if (userSpan) userSpan.textContent = '👤 ' + nombre;
            }
        }, 100);
    } catch (e) { console.error('Error cargando layouts:', e); }
}

function verificarSesion() {
    var token = localStorage.getItem('auth_token');
    if (!token) { window.location.href = '../../pages/login/login.html'; return false; }
    return true;
}

// =============================================
// TOAST
// =============================================
function mostrarToast(titulo, msg, tipo) {
    var toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = titulo;
    document.getElementById('toastMsg').textContent = msg;
    toast.className = 'toast show ' + (tipo || '');
    setTimeout(function() { toast.className = 'toast'; }, 4000);
}

// =============================================
// MODAL
// =============================================
function abrirModalNuevo() {
    document.getElementById('inputNuevoNombre').value = '';
    var msg = document.getElementById('mensajeModal');
    msg.className = 'mensaje';
    document.getElementById('modalNuevo').classList.add('open');
    setTimeout(function() { document.getElementById('inputNuevoNombre').focus(); }, 100);
}

function cerrarModalNuevo() {
    document.getElementById('modalNuevo').classList.remove('open');
}

// =============================================
// RENDER TABLA
// =============================================
function renderTabla(lista) {
    var contenedor = document.getElementById('tablaMeds');
    if (!lista.length) {
        contenedor.innerHTML = '<div class="empty-state"><i class="fas fa-pills"></i><h3>Sin resultados</h3><p>No se encontraron medicamentos con ese nombre</p></div>';
        return;
    }

    var html =
        '<table class="tabla-meds">' +
        '<thead><tr><th>ID</th><th>Nombre</th></tr></thead><tbody>';

    lista.forEach(function(m) {
        html += '<tr>' +
            '<td><span class="badge-id">' + m.id_medicamento + '</span></td>' +
            '<td>' + escapeHtml(m.nombre) + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    contenedor.innerHTML = html;
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =============================================
// CARGAR CATÁLOGO
// =============================================
async function cargarCatalogo(filtro) {
    var contenedor = document.getElementById('tablaMeds');
    contenedor.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    var res = await api.listarMedicamentos(filtro || '');

    if (!res.success) {
        contenedor.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error al cargar</h3><p>' + (res.error || 'Error de conexión') + '</p></div>';
        return;
    }

    listaMeds = res.data || [];
    renderTabla(listaMeds);
}

// =============================================
// GUARDAR NUEVO MEDICAMENTO
// =============================================
async function guardarNuevoMed() {
    var nombre = document.getElementById('inputNuevoNombre').value.trim();
    var msgDiv = document.getElementById('mensajeModal');

    if (!nombre) {
        msgDiv.textContent = 'El nombre no puede estar vacío.';
        msgDiv.className = 'mensaje error';
        return;
    }

    var btn = document.getElementById('btnGuardarMed');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    var res = await api.insertarMedicamento(nombre);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar';

    if (res.success) {
        cerrarModalNuevo();
        mostrarToast('Medicamento agregado', '"' + nombre + '" fue registrado en el catálogo.', 'success');
        await cargarCatalogo('');
        document.getElementById('busqueda').value = '';
    } else {
        msgDiv.textContent = res.error || 'Error al guardar el medicamento.';
        msgDiv.className = 'mensaje error';
    }
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarLayouts();
    if (!verificarSesion()) return;

    await cargarCatalogo('');

    document.getElementById('btnBuscar').addEventListener('click', function() {
        var filtro = document.getElementById('busqueda').value.trim();
        cargarCatalogo(filtro);
    });

    document.getElementById('busqueda').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            var filtro = this.value.trim();
            cargarCatalogo(filtro);
        }
    });

    document.getElementById('btnNuevoMed').addEventListener('click', abrirModalNuevo);

    document.getElementById('btnGuardarMed').addEventListener('click', guardarNuevoMed);

    document.getElementById('inputNuevoNombre').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') guardarNuevoMed();
    });

    document.getElementById('modalNuevo').addEventListener('click', function(e) {
        if (e.target === this) cerrarModalNuevo();
    });
});

window.cerrarModalNuevo = cerrarModalNuevo;
