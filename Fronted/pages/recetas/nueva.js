var API_BASE = 'http://localhost:8080';
var idCita = null;
var citaData = null;
var lineaCounter = 0;
var DRAFT_KEY = '';

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
            var token = localStorage.getItem('auth_token');
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
    if (!token) {
        window.location.href = '../../pages/login/login.html';
        return false;
    }
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
    setTimeout(function() { toast.className = 'toast'; }, 5000);
}

function mostrarMensaje(msg, tipo) {
    var div = document.getElementById('mensajeGlobal');
    div.textContent = msg;
    div.className = 'mensaje ' + tipo;
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(function() { div.className = 'mensaje'; }, 4000);
}

// =============================================
// CARGAR DATOS DE LA CITA
// =============================================
async function cargarCita() {
    var cardCita = document.getElementById('cardCita');
    var res = await api.obtenerCita(idCita);

    if (!res.success) {
        cardCita.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Cita no encontrada</h3><p>Verifica el ID de la cita</p></div>';
        return;
    }

    citaData = res.data;
    var fecha = citaData.fecha_inicio ? new Date(citaData.fecha_inicio).toLocaleDateString('es-GT') : '—';

    cardCita.innerHTML =
        '<div class="card-title"><i class="fas fa-calendar-check"></i> Datos de la Cita #' + idCita + '</div>' +
        '<div class="info-grid">' +
            '<div class="info-item"><span class="info-label">Paciente</span><span class="info-value">' + (citaData.paciente_nombre || '—') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Médico</span><span class="info-value">' + (citaData.medico_nombre || '—') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Colegiado</span><span class="info-value">' + (citaData.numero_colegiado || '—') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Servicio</span><span class="info-value">' + (citaData.servicio || '—') + '</span></div>' +
            '<div class="info-item"><span class="info-label">Fecha</span><span class="info-value">' + fecha + '</span></div>' +
            '<div class="info-item"><span class="info-label">Estado</span><span class="info-value">' + (citaData.estado || '—') + '</span></div>' +
        '</div>';
}

// =============================================
// AUTOCOMPLETE DE MEDICAMENTOS
// =============================================
var debounceTimers = {};

function iniciarAutocomplete(lineaId) {
    var input   = document.getElementById('med-nombre-' + lineaId);
    var hidden  = document.getElementById('med-id-' + lineaId);
    var dropdown = document.getElementById('dropdown-' + lineaId);

    if (!input) return;

    input.addEventListener('input', function() {
        hidden.value = '';
        clearTimeout(debounceTimers[lineaId]);
        var valor = input.value.trim();

        if (valor.length < 2) {
            cerrarDropdown(dropdown);
            return;
        }

        debounceTimers[lineaId] = setTimeout(async function() {
            var res = await api.listarMedicamentos(valor);
            var lista = (res.success && res.data) ? res.data : [];
            renderDropdown(dropdown, lista, valor, lineaId);
        }, 300);
    });

    input.addEventListener('blur', function() {
        setTimeout(function() { cerrarDropdown(dropdown); }, 200);
    });
}

function renderDropdown(dropdown, lista, texto, lineaId) {
    var html = '';
    lista.forEach(function(m) {
        html += '<div class="autocomplete-item" data-id="' + m.id_medicamento + '" data-nombre="' + escapeHtml(m.nombre) + '">' + escapeHtml(m.nombre) + '</div>';
    });
    html += '<div class="autocomplete-item agregar" data-agregar="1" data-texto="' + escapeHtml(texto) + '"><i class="fas fa-plus"></i> Agregar "' + escapeHtml(texto) + '" al catálogo</div>';

    dropdown.innerHTML = html;
    dropdown.classList.add('open');

    dropdown.querySelectorAll('.autocomplete-item[data-id]').forEach(function(item) {
        item.addEventListener('mousedown', function() {
            seleccionarMedicamento(lineaId, item.dataset.id, item.dataset.nombre);
        });
    });

    dropdown.querySelector('.autocomplete-item[data-agregar]').addEventListener('mousedown', async function() {
        var nombre = this.dataset.texto;
        await agregarNuevoMedicamento(nombre, lineaId);
    });
}

function cerrarDropdown(dropdown) {
    if (dropdown) dropdown.classList.remove('open');
}

function seleccionarMedicamento(lineaId, id, nombre) {
    document.getElementById('med-nombre-' + lineaId).value = nombre;
    document.getElementById('med-id-' + lineaId).value = id;
    cerrarDropdown(document.getElementById('dropdown-' + lineaId));
}

async function agregarNuevoMedicamento(nombre, lineaId) {
    var res = await api.insertarMedicamento(nombre);
    if (res.success && res.data) {
        seleccionarMedicamento(lineaId, res.data.id_medicamento, res.data.nombre);
        mostrarToast('Medicamento agregado', '"' + nombre + '" fue agregado al catálogo.', 'success');
    } else {
        mostrarToast('Error', res.error || 'No se pudo agregar el medicamento.', 'error');
    }
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =============================================
// MANEJO DE LÍNEAS
// =============================================
function agregarLinea(nombre, idMed, observaciones) {
    lineaCounter++;
    var id = lineaCounter;
    var lista = document.getElementById('lineasLista');

    var div = document.createElement('div');
    div.className = 'linea-item';
    div.id = 'linea-' + id;
    div.innerHTML =
        '<span class="linea-num">#' + id + '</span>' +
        '<button type="button" class="btn-eliminar-linea no-print" title="Eliminar" onclick="eliminarLinea(' + id + ')">' +
            '<i class="fas fa-times"></i>' +
        '</button>' +
        '<div class="linea-body">' +
            '<div class="form-group">' +
                '<label><i class="fas fa-pills"></i> Medicamento</label>' +
                '<div class="autocomplete-wrapper">' +
                    '<input type="text" id="med-nombre-' + id + '" placeholder="Buscar medicamento..." value="' + escapeHtml(nombre || '') + '" autocomplete="off">' +
                    '<input type="hidden" id="med-id-' + id + '" value="' + escapeHtml(idMed || '') + '">' +
                    '<div class="autocomplete-dropdown" id="dropdown-' + id + '"></div>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label><i class="fas fa-file-medical-alt"></i> Indicaciones</label>' +
                '<textarea id="obs-' + id + '" placeholder="Ej: 1 tableta cada 8 horas por 7 días, vía oral" maxlength="500">' + escapeHtml(observaciones || '') + '</textarea>' +
            '</div>' +
        '</div>';

    lista.appendChild(div);
    iniciarAutocomplete(id);
    actualizarNumerosLineas();
    guardarBorrador();
}

function eliminarLinea(id) {
    var el = document.getElementById('linea-' + id);
    if (el) el.remove();
    actualizarNumerosLineas();
    guardarBorrador();
}

function actualizarNumerosLineas() {
    var items = document.querySelectorAll('.linea-item');
    items.forEach(function(item, idx) {
        var badge = item.querySelector('.linea-num');
        if (badge) badge.textContent = '#' + (idx + 1);
    });
}

// =============================================
// BORRADOR EN LOCALSTORAGE
// =============================================
function guardarBorrador() {
    var lineas = obtenerLineasDOM();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(lineas));
}

function cargarBorrador() {
    var raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    try {
        var lineas = JSON.parse(raw);
        if (!lineas || !lineas.length) return false;
        lineas.forEach(function(l) { agregarLinea(l.nombre, l.idMed, l.obs); });
        mostrarToast('Borrador cargado', 'Se restauró el borrador anterior.', 'info');
        return true;
    } catch (e) { return false; }
}

function limpiarBorrador() {
    localStorage.removeItem(DRAFT_KEY);
    var lista = document.getElementById('lineasLista');
    lista.innerHTML = '';
    lineaCounter = 0;
    agregarLinea('', '', '');
}

function obtenerLineasDOM() {
    var items = document.querySelectorAll('.linea-item');
    var result = [];
    items.forEach(function(item) {
        var id = item.id.replace('linea-', '');
        result.push({
            idMed:  document.getElementById('med-id-' + id)    ? document.getElementById('med-id-'    + id).value : '',
            nombre: document.getElementById('med-nombre-' + id) ? document.getElementById('med-nombre-' + id).value : '',
            obs:    document.getElementById('obs-' + id)        ? document.getElementById('obs-' + id).value : ''
        });
    });
    return result;
}

// =============================================
// VALIDAR
// =============================================
function validarLineas(lineas) {
    if (!lineas.length) {
        mostrarMensaje('Agrega al menos un medicamento.', 'error');
        return false;
    }
    for (var i = 0; i < lineas.length; i++) {
        if (!lineas[i].idMed) {
            mostrarMensaje('Selecciona un medicamento en la línea #' + (i + 1) + '.', 'error');
            return false;
        }
        if (lineas[i].obs && lineas[i].obs.length > 500) {
            mostrarMensaje('Las indicaciones de la línea #' + (i + 1) + ' exceden 500 caracteres.', 'error');
            return false;
        }
    }
    return true;
}

// =============================================
// GUARDAR RECETA
// =============================================
async function guardarReceta() {
    var lineas = obtenerLineasDOM();
    if (!validarLineas(lineas)) return;

    var btn = document.getElementById('btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    // Primera línea → crea la receta y devuelve Orden_Receta
    var primera = lineas[0];
    var res = await api.crearReceta(parseInt(idCita), parseInt(primera.idMed), primera.obs);

    if (!res.success) {
        mostrarMensaje(res.error || 'Error al crear la receta.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Guardar Receta';
        return;
    }

    var orden = res.data.Orden_Receta;

    // Líneas restantes
    for (var i = 1; i < lineas.length; i++) {
        var linea = lineas[i];
        var r2 = await api.agregarLineaReceta(orden, parseInt(linea.idMed), linea.obs);
        if (!r2.success) {
            mostrarMensaje('Receta guardada parcialmente (error en línea ' + (i + 1) + '). Orden: ' + orden, 'error');
            break;
        }
    }

    // Limpiar borrador y redirigir
    localStorage.removeItem(DRAFT_KEY);
    mostrarToast('Receta emitida', 'Orden: ' + orden, 'success');

    setTimeout(function() {
        window.location.href = 'detalle.html?orden=' + encodeURIComponent(orden);
    }, 1800);
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarLayouts();
    if (!verificarSesion()) return;

    var params = new URLSearchParams(window.location.search);
    idCita = params.get('idCita');

    if (!idCita) {
        document.getElementById('cardCita').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>ID de cita requerido</h3><p>Accede desde la lista de citas</p></div>';
        return;
    }

    DRAFT_KEY = 'receta_borrador_' + idCita;

    await cargarCita();

    var tieneBorrador = cargarBorrador();
    if (!tieneBorrador) agregarLinea('', '', '');

    document.getElementById('btnAgregarLinea').addEventListener('click', function() {
        agregarLinea('', '', '');
    });

    document.getElementById('btnGuardar').addEventListener('click', guardarReceta);

    document.getElementById('btnLimpiarBorrador').addEventListener('click', function() {
        if (confirm('¿Descartar el borrador y limpiar el formulario?')) limpiarBorrador();
    });

    // Auto-guardar borrador al cambiar cualquier campo
    document.getElementById('lineasLista').addEventListener('input', guardarBorrador);
});
