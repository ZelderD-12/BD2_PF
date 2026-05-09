var idPaciente = null;
var todasLasRecetas = [];

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
// AGRUPAR RECETAS POR ORDEN
// =============================================
function agruparPorOrden(lineas) {
    var grupos = {};
    lineas.forEach(function(l) {
        var ord = l.Orden_Receta;
        if (!grupos[ord]) {
            grupos[ord] = {
                Orden_Receta:   ord,
                fecha_emision:  l.fecha_emision,
                medico_nombre:  l.medico_nombre,
                id_cita:        l.id_cita,
                lineas:         []
            };
        }
        if (l.activo !== 0 && l.activo !== false) {
            grupos[ord].lineas.push(l);
        }
    });
    return Object.values(grupos);
}

// =============================================
// FILTRAR
// =============================================
function filtrarPorFecha(grupos) {
    var desde = document.getElementById('filtroDesde').value;
    var hasta = document.getElementById('filtroHasta').value;
    if (!desde && !hasta) return grupos;

    return grupos.filter(function(g) {
        if (!g.fecha_emision) return true;
        var fecha = new Date(g.fecha_emision);
        if (desde && fecha < new Date(desde)) return false;
        if (hasta && fecha > new Date(hasta + 'T23:59:59')) return false;
        return true;
    });
}

// =============================================
// RENDER TABLA
// =============================================
function renderTabla(grupos) {
    var contenedor = document.getElementById('tablaHistorial');

    if (!grupos.length) {
        contenedor.innerHTML = '<div class="empty-state"><i class="fas fa-file-medical"></i><h3>Sin recetas</h3><p>No se encontraron recetas para este paciente en el periodo seleccionado</p></div>';
        return;
    }

    var html =
        '<table class="tabla-recetas">' +
        '<thead><tr>' +
            '<th>Orden</th>' +
            '<th>Fecha</th>' +
            '<th>Médico</th>' +
            '<th>Cita</th>' +
            '<th># Medicamentos</th>' +
            '<th>Acciones</th>' +
        '</tr></thead><tbody>';

    grupos.forEach(function(g) {
        var fecha = g.fecha_emision ? new Date(g.fecha_emision).toLocaleDateString('es-GT') : '—';
        html += '<tr style="cursor:pointer;" onclick="verDetalle(\'' + escapeHtml(g.Orden_Receta) + '\')">' +
            '<td><span class="badge-orden">' + escapeHtml(g.Orden_Receta) + '</span></td>' +
            '<td>' + fecha + '</td>' +
            '<td>' + escapeHtml(g.medico_nombre || '—') + '</td>' +
            '<td>#' + escapeHtml(String(g.id_cita || '—')) + '</td>' +
            '<td>' + g.lineas.length + '</td>' +
            '<td>' +
                '<button class="btn-secondary" style="padding:6px 14px; font-size:0.8rem;" onclick="event.stopPropagation(); verDetalle(\'' + escapeHtml(g.Orden_Receta) + '\')">' +
                    '<i class="fas fa-eye"></i> Ver' +
                '</button>' +
            '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    contenedor.innerHTML = html;
}

function verDetalle(ord) {
    window.location.href = 'detalle.html?orden=' + encodeURIComponent(ord);
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =============================================
// CARGAR HISTORIAL
// =============================================
async function cargarHistorial() {
    var contenedor = document.getElementById('tablaHistorial');
    contenedor.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    var res = await api.recetasPorPaciente(idPaciente);

    if (!res.success) {
        contenedor.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error al cargar</h3><p>' + (res.error || 'Error de conexión') + '</p></div>';
        return;
    }

    todasLasRecetas = agruparPorOrden(res.data || []);
    renderTabla(filtrarPorFecha(todasLasRecetas));
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarLayouts();
    if (!verificarSesion()) return;

    var params = new URLSearchParams(window.location.search);
    idPaciente = params.get('idPaciente') || localStorage.getItem('user_id');

    if (!idPaciente) {
        document.getElementById('tablaHistorial').innerHTML =
            '<div class="empty-state"><i class="fas fa-user"></i><h3>Paciente no especificado</h3><p>Accede desde el perfil del paciente</p></div>';
        return;
    }

    await cargarHistorial();

    document.getElementById('btnFiltrar').addEventListener('click', function() {
        renderTabla(filtrarPorFecha(todasLasRecetas));
    });

    document.getElementById('btnLimpiarFiltro').addEventListener('click', function() {
        document.getElementById('filtroDesde').value = '';
        document.getElementById('filtroHasta').value = '';
        renderTabla(todasLasRecetas);
    });
});

window.verDetalle = verDetalle;
