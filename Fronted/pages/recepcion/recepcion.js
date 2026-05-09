var API_BASE = 'http://localhost:8080';
var ticketActualId = null;
var ticketActualEstado = null;
var pollingCola = null;

// =============================================
// LAYOUTS (mismo patron que FamKon_Clinic.js)
// =============================================
async function cargarLayouts() {
    try {
        var headerResp = await fetch('../../layouts/header.html');
        document.getElementById('header').innerHTML = await headerResp.text();

        var navResp = await fetch('../../layouts/nav.html');
        document.getElementById('nav').innerHTML = await navResp.text();

        var footerResp = await fetch('../../layouts/footer.html');
        document.getElementById('footer').innerHTML = await footerResp.text();

        // Mostrar nombre del usuario en el header igual que en el inicio
        var userName = localStorage.getItem('user_nombre');
        var token    = localStorage.getItem('auth_token');
        setTimeout(function() {
            var btnLogin  = document.getElementById('btnLoginHeader');
            var userInfo  = document.getElementById('userInfoHeader');
            var userSpan  = document.getElementById('userNameHeader');
            if (token && userName) {
                if (btnLogin) btnLogin.style.display = 'none';
                if (userInfo) userInfo.style.display = 'flex';
                if (userSpan) userSpan.textContent = '👤 ' + userName;
            }
        }, 100);
    } catch (e) {
        console.error('Error cargando layouts:', e);
    }
}

// =============================================
// SESION
// =============================================
function verificarSesion() {
    var token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '../../pages/login/login.html';
        return null;
    }
    return token;
}

function getAuthHeaders() {
    var token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };
}

// =============================================
// PRIORIDAD ESPECIAL - mostrar/ocultar campos
// =============================================
var prioridadSelect = document.getElementById('prioridad');
var seccionEspecial = document.getElementById('seccionEspecial');

if (prioridadSelect) {
    prioridadSelect.addEventListener('change', function() {
        if (this.value === 'ESPECIAL') {
            seccionEspecial.style.display = 'block';
            document.getElementById('idSupervisor').required = true;
            document.getElementById('motivoEspecial').required = true;
        } else {
            seccionEspecial.style.display = 'none';
            document.getElementById('idSupervisor').required = false;
            document.getElementById('motivoEspecial').required = false;
        }
    });
}

// =============================================
// MOSTRAR MENSAJE
// =============================================
function mostrarMensaje(elementId, texto, tipo) {
    var el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = texto;
    el.className = 'mensaje ' + tipo;
    setTimeout(function() {
        el.className = 'mensaje';
        el.textContent = '';
    }, 4000);
}

// =============================================
// GENERAR TICKET
// =============================================
var formTicket = document.getElementById('formTicket');

if (formTicket) {
    formTicket.addEventListener('submit', function(e) {
        e.preventDefault();

        var token = verificarSesion();
        if (!token) return;

        var idSede      = parseInt(document.getElementById('idSede').value);
        var idServicio  = parseInt(document.getElementById('idServicio').value);
        var idPaciente  = parseInt(document.getElementById('idPaciente').value);
        var prioridad   = document.getElementById('prioridad').value;
        var idCitaVal   = document.getElementById('idCita').value;
        var idCita      = idCitaVal ? parseInt(idCitaVal) : null;

        if (!idSede || !idServicio || !idPaciente || !prioridad) {
            mostrarMensaje('mensajeTicket', 'Completa todos los campos requeridos', 'error');
            return;
        }

        var body = {
            id_paciente: idPaciente,
            id_sede: idSede,
            id_servicio: idServicio,
            prioridad: prioridad
        };

        if (idCita) body.id_cita = idCita;

        if (prioridad === 'ESPECIAL') {
            var supervisor = document.getElementById('idSupervisor').value;
            var motivo     = document.getElementById('motivoEspecial').value;
            if (!supervisor || !motivo) {
                mostrarMensaje('mensajeTicket', 'El ticket ESPECIAL requiere supervisor y motivo', 'error');
                return;
            }
            body.id_supervisor   = parseInt(supervisor);
            body.motivo_especial = motivo;
        }

        var btnGenerar = document.getElementById('btnGenerar');
        btnGenerar.disabled = true;
        btnGenerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

        fetch(API_BASE + '/api/tickets/generar', {
            method: 'POST',
            headers: Object.assign({}, getAuthHeaders(), {
                'Idempotency-Key': generarUUID()
            }),
            body: JSON.stringify(body)
        })
        .then(function(res) { return res.json().then(function(d) { return { status: res.status, data: d }; }); })
        .then(function(r) {
            if (r.status === 201) {
                mostrarMensaje('mensajeTicket', 'Ticket ' + r.data.data.codigo_ticket + ' generado correctamente', 'success');
                formTicket.reset();
                seccionEspecial.style.display = 'none';
                cargarCola();
            } else if (r.status === 409) {
                mostrarMensaje('mensajeTicket', 'Ya existe un ticket activo para esta cita', 'error');
            } else {
                mostrarMensaje('mensajeTicket', r.data.error || 'Error al generar ticket', 'error');
            }
        })
        .catch(function() {
            mostrarMensaje('mensajeTicket', 'Error de conexion con el servidor', 'error');
        })
        .finally(function() {
            btnGenerar.disabled = false;
            btnGenerar.innerHTML = '<i class="fas fa-plus-circle"></i> Generar Ticket';
        });
    });
}

// =============================================
// LLAMAR SIGUIENTE
// =============================================
var btnLlamar = document.getElementById('btnLlamar');

if (btnLlamar) {
    btnLlamar.addEventListener('click', function() {
        if (!verificarSesion()) return;

        var idSede     = document.getElementById('idSede').value;
        var idServicio = document.getElementById('idServicio').value;

        if (!idSede || !idServicio) {
            mostrarMensaje('mensajeLlamar', 'Selecciona sede y servicio primero en el formulario de arriba', 'error');
            return;
        }

        btnLlamar.disabled = true;
        btnLlamar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Llamando...';

        fetch(API_BASE + '/api/tickets/siguiente', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_sede: parseInt(idSede),
                id_servicio: parseInt(idServicio)
            })
        })
        .then(function(res) { return res.json().then(function(d) { return { status: res.status, data: d }; }); })
        .then(function(r) {
            if (r.status === 200) {
                mostrarMensaje('mensajeLlamar', 'Llamando ticket ' + r.data.data.codigo_ticket, 'success');
                mostrarTicketActual(r.data.data);
                cargarCola();
            } else if (r.status === 404) {
                mostrarMensaje('mensajeLlamar', 'No hay pacientes en cola', 'info');
            } else {
                mostrarMensaje('mensajeLlamar', r.data.error || 'Error al llamar siguiente', 'error');
            }
        })
        .catch(function() {
            mostrarMensaje('mensajeLlamar', 'Error de conexion con el servidor', 'error');
        })
        .finally(function() {
            btnLlamar.disabled = false;
            btnLlamar.innerHTML = '<i class="fas fa-bullhorn"></i> Llamar Siguiente';
        });
    });
}

// =============================================
// MOSTRAR TICKET ACTUAL
// =============================================
function mostrarTicketActual(ticket) {
    ticketActualId     = ticket.id_ticket;
    ticketActualEstado = ticket.estado || 'LLAMADO';

    var div = document.getElementById('ticketActual');
    div.innerHTML =
        '<div class="ticket-info-card">' +
            '<div class="ticket-codigo-grande">' + ticket.codigo_ticket + '</div>' +
            '<div class="ticket-detalle">' +
                '<p><i class="fas fa-user"></i> <strong>Paciente:</strong> ' + (ticket.paciente || 'ID: ' + ticket.id_paciente) + '</p>' +
                '<p><i class="fas fa-sort-amount-up"></i> <strong>Prioridad:</strong> <span class="prioridad-badge prior-' + ticket.prioridad + '">' + ticket.prioridad + '</span></p>' +
                '<p><i class="fas fa-stethoscope"></i> <strong>Servicio:</strong> ' + (ticket.servicio || '-') + '</p>' +
                '<p><i class="fas fa-clock"></i> <strong>Estado:</strong> ' + (ticket.estado || 'LLAMADO') + '</p>' +
            '</div>' +
        '</div>';

    actualizarBotonesAccion(ticketActualEstado);
    document.getElementById('accionesTicket').style.display = 'flex';
    document.getElementById('mensajeAccion').className = 'mensaje';
}

function actualizarBotonesAccion(estado) {
    var btnEn  = document.getElementById('btnEnAtencion');
    var btnFin = document.getElementById('btnFinalizar');
    var btnNS  = document.getElementById('btnNoShow');

    btnEn.style.display  = estado === 'LLAMADO' ? 'flex' : 'none';
    btnNS.style.display  = estado === 'LLAMADO' ? 'flex' : 'none';
    btnFin.style.display = estado === 'EN_ATENCION' ? 'flex' : 'none';
}

// =============================================
// ACCIONES SOBRE EL TICKET ACTUAL
// =============================================
function cambiarEstadoTicket(nuevoEstado, motivo) {
    if (!ticketActualId) return;
    if (!verificarSesion()) return;

    fetch(API_BASE + '/api/tickets/' + ticketActualId + '/estado', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nuevo_estado: nuevoEstado, motivo: motivo || null })
    })
    .then(function(res) { return res.json().then(function(d) { return { status: res.status, data: d }; }); })
    .then(function(r) {
        if (r.status === 200) {
            mostrarMensaje('mensajeAccion', 'Ticket actualizado a ' + nuevoEstado, 'success');
            if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'NO_SHOW') {
                ticketActualId = null;
                ticketActualEstado = null;
                document.getElementById('ticketActual').innerHTML =
                    '<div class="ticket-actual-vacio"><i class="fas fa-inbox"></i><p>Sin ticket en atencion</p></div>';
                document.getElementById('accionesTicket').style.display = 'none';
            } else {
                ticketActualEstado = nuevoEstado;
                actualizarBotonesAccion(nuevoEstado);
            }
            cargarCola();
        } else {
            mostrarMensaje('mensajeAccion', r.data.error || 'Error al cambiar estado', 'error');
        }
    })
    .catch(function() {
        mostrarMensaje('mensajeAccion', 'Error de conexion con el servidor', 'error');
    });
}

var btnEnAtencion = document.getElementById('btnEnAtencion');
var btnFinalizar  = document.getElementById('btnFinalizar');
var btnNoShow     = document.getElementById('btnNoShow');

if (btnEnAtencion) {
    btnEnAtencion.addEventListener('click', function() {
        cambiarEstadoTicket('EN_ATENCION', null);
    });
}

if (btnFinalizar) {
    btnFinalizar.addEventListener('click', function() {
        if (confirm('Confirmar finalizacion de atencion?')) {
            cambiarEstadoTicket('FINALIZADO', null);
        }
    });
}

if (btnNoShow) {
    btnNoShow.addEventListener('click', function() {
        if (confirm('Marcar paciente como No Show?')) {
            cambiarEstadoTicket('NO_SHOW', 'Paciente no se presento');
        }
    });
}

// =============================================
// CARGAR COLA
// =============================================
function cargarCola() {
    var idSede     = document.getElementById('idSede').value;
    var idServicio = document.getElementById('idServicio').value;

    if (!idSede || !idServicio) {
        document.getElementById('listaCola').innerHTML =
            '<div class="cola-vacia"><i class="fas fa-info-circle"></i><p>Selecciona sede y servicio</p></div>';
        return;
    }

    fetch(API_BASE + '/api/pantalla/cola?id_sede=' + idSede + '&id_servicio=' + idServicio, {
        headers: getAuthHeaders()
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        var proximos = (data.data && data.data.proximos) ? data.data.proximos : [];
        var container = document.getElementById('listaCola');
        var contador  = document.getElementById('contadorCola');

        contador.textContent = proximos.length;

        if (proximos.length === 0) {
            container.innerHTML =
                '<div class="cola-vacia"><i class="fas fa-check-circle"></i><p>Cola vacia</p></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < proximos.length; i++) {
            var t = proximos[i];
            html +=
                '<div class="cola-item prior-' + t.prioridad + '">' +
                    '<span class="cola-posicion">' + (i + 1) + '</span>' +
                    '<span class="cola-codigo">' + t.codigo_ticket + '</span>' +
                    '<div class="cola-datos">' +
                        '<p><span class="prioridad-badge prior-' + t.prioridad + '">' + t.prioridad + '</span></p>' +
                    '</div>' +
                '</div>';
        }
        container.innerHTML = html;
    })
    .catch(function() {
        document.getElementById('listaCola').innerHTML =
            '<div class="cola-vacia"><i class="fas fa-exclamation-circle"></i><p>Error al cargar cola</p></div>';
    });
}

// Recargar cola al cambiar sede o servicio
var idSedeEl     = document.getElementById('idSede');
var idServicioEl = document.getElementById('idServicio');

if (idSedeEl)     idSedeEl.addEventListener('change', cargarCola);
if (idServicioEl) idServicioEl.addEventListener('change', cargarCola);

// =============================================
// POLLING AUTOMATICO CADA 5 SEGUNDOS
// =============================================
function iniciarPolling() {
    pollingCola = setInterval(cargarCola, 5000);
}

// =============================================
// UUID para Idempotency-Key
// =============================================
function generarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarLayouts();
    cargarCola();
    iniciarPolling();
});
