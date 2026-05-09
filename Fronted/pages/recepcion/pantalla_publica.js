var API_BASE = 'http://localhost:8080';

// Valores por defecto (se pueden parametrizar en URL)
var params     = new URLSearchParams(window.location.search);
var ID_SEDE    = params.get('id_sede')    || '1';
var ID_SERVICIO= params.get('id_servicio')|| '1';

// =============================================
// RELOJ EN TIEMPO REAL
// =============================================
function actualizarReloj() {
    var ahora = new Date();
    var horas   = String(ahora.getHours()).padStart(2, '0');
    var minutos = String(ahora.getMinutes()).padStart(2, '0');
    var segundos= String(ahora.getSeconds()).padStart(2, '0');
    var el = document.getElementById('horaActual');
    if (el) el.textContent = horas + ':' + minutos + ':' + segundos;
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

// =============================================
// OBTENER COLA PUBLICA
// =============================================
function obtenerCola() {
    fetch(API_BASE + '/api/pantalla/cola?id_sede=' + ID_SEDE + '&id_servicio=' + ID_SERVICIO)
    .then(function(res) { return res.json(); })
    .then(function(response) {
        var data = response.data || {};
        renderTicketLlamado(data.llamado_actual || null);
        renderProximos(data.proximos || []);
    })
    .catch(function() {
        // Fallo silencioso — la pantalla mantiene el ultimo estado visible
    });
}

// =============================================
// RENDER TICKET LLAMADO
// =============================================
var ultimoTicketId = null;

function renderTicketLlamado(ticket) {
    var container = document.getElementById('ticketLlamado');

    if (!ticket) {
        container.innerHTML =
            '<div class="sin-ticket">' +
                '<i class="fas fa-hourglass-half"></i>' +
                '<p>Esperando llamado...</p>' +
            '</div>';
        container.className = 'ticket-llamado-vacio';
        ultimoTicketId = null;
        return;
    }

    // Solo animar si cambio el ticket
    var esNuevo = ticket.id_ticket !== ultimoTicketId;
    ultimoTicketId = ticket.id_ticket;

    var nombrePaciente = ticket.paciente || '';

    container.className = 'ticket-llamado-activo';
    container.innerHTML =
        '<div class="ticket-numero-pantalla">' + ticket.codigo_ticket + '</div>' +
        (nombrePaciente
            ? '<div class="ticket-paciente-nombre"><i class="fas fa-user"></i> ' + nombrePaciente + '</div>'
            : '') +
        '<div class="ticket-prioridad-pantalla prior-' + ticket.prioridad + '">' + ticket.prioridad + '</div>' +
        '<div class="ticket-consultorio"><i class="fas fa-door-open"></i> Pase a ventanilla</div>';

    if (esNuevo) {
        reproducirSonido();
        container.style.animation = 'none';
        container.offsetHeight; // reflow
        container.style.animation = 'aparecer 0.5s ease';
    }
}

// =============================================
// RENDER PROXIMOS
// =============================================
function renderProximos(lista) {
    var container = document.getElementById('listaProximos');

    if (!lista || lista.length === 0) {
        container.innerHTML =
            '<div class="proximos-vacio">' +
                '<i class="fas fa-check-circle"></i>' +
                '<p>Sin pacientes en espera</p>' +
            '</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < lista.length && i < 5; i++) {
        var t = lista[i];
        html +=
            '<div class="proximo-item prior-' + t.prioridad + '">' +
                '<span class="proximo-pos">' + (i + 1) + '</span>' +
                '<span class="proximo-codigo">' + t.codigo_ticket + '</span>' +
                '<div class="proximo-datos">' +
                    '<span class="proximo-prioridad prior-' + t.prioridad + '">' + t.prioridad + '</span>' +
                '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

// =============================================
// SONIDO DE LLAMADO (beep simple via AudioContext)
// =============================================
function reproducirSonido() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        // AudioContext no disponible, no pasa nada
    }
}

// =============================================
// POLLING CADA 5 SEGUNDOS
// =============================================
obtenerCola();
setInterval(obtenerCola, 5000);
