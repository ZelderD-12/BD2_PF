var orden = null;
var idRecetaPendienteAnular = null;

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
    return !!localStorage.getItem('auth_token');
}

// =============================================
// TOAST
// =============================================
function mostrarToast(titulo, msg, tipo) {
    var toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = titulo;
    document.getElementById('toastMsg').textContent = msg;
    toast.className = 'toast show ' + (tipo || '');
    setTimeout(function() { toast.className = 'toast'; }, 5000);
}

// =============================================
// MODAL ANULAR
// =============================================
function abrirModalAnular(idReceta, nombreMed) {
    idRecetaPendienteAnular = idReceta;
    document.getElementById('modalAnularMsg').textContent =
        '¿Anular "' + nombreMed + '" de esta receta? La línea quedará inactiva.';
    document.getElementById('modalAnular').classList.add('open');
}

function cerrarModal() {
    document.getElementById('modalAnular').classList.remove('open');
    idRecetaPendienteAnular = null;
}

async function confirmarAnular() {
    if (!idRecetaPendienteAnular) return;
    var btn = document.getElementById('btnConfirmarAnular');
    btn.disabled = true;
    btn.textContent = 'Anulando...';

    var res = await api.anularLineaReceta(idRecetaPendienteAnular);
    cerrarModal();
    btn.disabled = false;
    btn.textContent = 'Anular';

    if (res.success) {
        mostrarToast('Línea anulada', 'El medicamento fue anulado de la receta.', 'success');
        await renderReceta();
    } else {
        mostrarToast('Error', res.error || 'No se pudo anular.', 'error');
    }
}

// =============================================
// RENDERIZAR RECETA
// =============================================
async function renderReceta() {
    var contenido = document.getElementById('contenidoReceta');
    contenido.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    var res = await api.consultarReceta(orden);

    if (!res.success || !res.data || !res.data.length) {
        contenido.innerHTML = '<div class="empty-state"><i class="fas fa-file-medical-alt"></i><h3>Receta no encontrada</h3><p>Verifica el número de orden</p></div>';
        return;
    }

    var lineas   = res.data;
    var primera  = lineas[0];
    var fecha    = primera.fecha_emision ? new Date(primera.fecha_emision).toLocaleDateString('es-GT') : '—';
    var esPersonal = verificarSesion();

    // Actualizar print header
    var ph = document.getElementById('printHeader');
    if (ph) ph.style.display = 'block';

    var html =
        '<div class="card">' +
            '<div class="card-title"><i class="fas fa-file-prescription"></i> Receta <span class="badge-orden">' + orden + '</span></div>' +
            '<div class="info-grid">' +
                '<div class="info-item"><span class="info-label">Paciente</span><span class="info-value">' + escapeHtml(primera.paciente_nombre || '—') + '</span></div>' +
                '<div class="info-item"><span class="info-label">Médico</span><span class="info-value">' + escapeHtml(primera.medico_nombre || '—') + '</span></div>' +
                '<div class="info-item"><span class="info-label">Colegiado</span><span class="info-value">' + escapeHtml(primera.numero_colegiado || '—') + '</span></div>' +
                '<div class="info-item"><span class="info-label">Cita</span><span class="info-value">#' + escapeHtml(String(primera.id_cita || '—')) + '</span></div>' +
                '<div class="info-item"><span class="info-label">Fecha emisión</span><span class="info-value">' + fecha + '</span></div>' +
            '</div>' +
        '</div>' +
        '<div class="card">' +
            '<div class="card-title"><i class="fas fa-pills"></i> Medicamentos</div>' +
            '<table class="tabla-recetas">' +
                '<thead><tr><th>#</th><th>Medicamento</th><th>Indicaciones</th>' +
                (esPersonal ? '<th class="no-print">Acciones</th>' : '') +
                '</tr></thead><tbody>';

    lineas.forEach(function(l, idx) {
        var anulado = l.activo === false || l.activo === 0;
        html += '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td class="' + (anulado ? 'anulado' : '') + '">' + escapeHtml(l.nombre_medicamento || '—') + '</td>' +
            '<td class="' + (anulado ? 'anulado' : '') + '">' + escapeHtml(l.observaciones || '—') + '</td>';

        if (esPersonal) {
            html += '<td class="no-print">';
            if (!anulado) {
                html += '<button class="btn-danger" onclick="abrirModalAnular(' + l.id_receta + ', \'' + escapeHtml(l.nombre_medicamento || '') + '\')"><i class="fas fa-ban"></i> Anular</button>';
            } else {
                html += '<span style="color:#6C757D; font-size:0.8rem;">Anulado</span>';
            }
            html += '</td>';
        }

        html += '</tr>';
    });

    html += '</tbody></table></div>';

    contenido.innerHTML = html;
    document.getElementById('botonesAccion').style.display = 'flex';
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarLayouts();

    var params = new URLSearchParams(window.location.search);
    orden = params.get('orden');

    if (!orden) {
        document.getElementById('contenidoReceta').innerHTML =
            '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Orden no especificada</h3><p>Accede desde la lista de recetas o desde la emisión</p></div>';
        return;
    }

    document.title = 'FamKon Clinic | Receta ' + orden;

    await renderReceta();

    document.getElementById('btnConfirmarAnular').addEventListener('click', confirmarAnular);

    document.getElementById('modalAnular').addEventListener('click', function(e) {
        if (e.target === this) cerrarModal();
    });
});

window.abrirModalAnular = abrirModalAnular;
window.cerrarModal = cerrarModal;
