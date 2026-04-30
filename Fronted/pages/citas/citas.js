var citasData = [];
var medicosPorEspecialidad = {
    1: [{ id: 1, nombre: "Dra. Maria Gonzalez" }, { id: 2, nombre: "Dr. Juan Perez" }],
    2: [{ id: 3, nombre: "Dr. Carlos Ruiz" }, { id: 4, nombre: "Dra. Laura Martinez" }],
    3: [{ id: 5, nombre: "Dr. Ricardo Mendez" }, { id: 6, nombre: "Dra. Patricia Soto" }],
    4: [{ id: 7, nombre: "Dra. Ana Fernandez" }, { id: 8, nombre: "Dr. Andres Castro" }],
    5: [{ id: 9, nombre: "Dra. Carolina Jimenez" }, { id: 10, nombre: "Dr. Roberto Paz" }]
};

var horariosDisponibles = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30"
];

var modal = document.getElementById('modalCita');
var btnNuevaCita = document.getElementById('btnNuevaCita');
var closeModal = document.querySelector('.close-modal');
var formNuevaCita = document.getElementById('formNuevaCita');
var especialidadSelect = document.getElementById('especialidad');
var medicoSelect = document.getElementById('medico');
var fechaInput = document.getElementById('fecha');
var horaSelect = document.getElementById('hora');

function verificarSesion() {
    var token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = '../../Login.html';
        return false;
    }
    return true;
}

function abrirModal() {
    if (!verificarSesion()) return;
    modal.style.display = 'flex';
}

function cerrarModal() {
    modal.style.display = 'none';
    formNuevaCita.reset();
    var msgDiv = document.getElementById('mensajeCita');
    msgDiv.innerHTML = '';
    msgDiv.className = 'mensaje-cita';
}

function mostrarMensaje(mensaje, tipo) {
    var msgDiv = document.getElementById('mensajeCita');
    msgDiv.innerHTML = mensaje;
    msgDiv.className = 'mensaje-cita ' + tipo;
    
    setTimeout(function() {
        msgDiv.style.display = 'none';
    }, 3000);
}

async function cargarCitas() {
    var container = document.getElementById('citasList');
    
    if (!localStorage.getItem('auth_token')) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Debes iniciar sesion</h3><p>Para ver tus citas, por favor inicia sesion</p><a href="../../Login.html" class="btn-nueva-cita" style="display: inline-block; margin-top: 20px;">Iniciar Sesion</a></div>';
        return;
    }
    
    try {
        setTimeout(function() {
            citasData = [];
            
            if (citasData.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-alt"></i><h3>No tienes citas agendadas</h3><p>Agenda tu primera cita medica</p><button onclick="abrirModal()" class="btn-nueva-cita" style="margin-top: 20px;">Agendar Cita</button></div>';
            } else {
                var html = '';
                for (var i = 0; i < citasData.length; i++) {
                    var cita = citasData[i];
                    html += '<div class="cita-card"><div class="cita-header"><span class="cita-especialidad"><i class="fas fa-stethoscope"></i> ' + cita.especialidad + '</span><span class="estado-badge estado-' + cita.estado + '">' + cita.estado + '</span></div><div class="cita-info"><p><i class="fas fa-calendar-day"></i> ' + cita.fecha + '</p><p><i class="fas fa-clock"></i> ' + cita.hora + '</p><p><i class="fas fa-user-md"></i> ' + cita.medico + '</p><p><i class="fas fa-building"></i> ' + cita.sede + '</p></div><div class="cita-buttons">';
                    
                    if (cita.estado === 'CONFIRMADA') {
                        html += '<button class="btn-cita btn-ticket" onclick="generarTicket(' + cita.id + ')">Ticket</button><button class="btn-cita btn-cancelar" onclick="cancelarCita(' + cita.id + ')">Cancelar</button>';
                    } else if (cita.estado === 'PENDIENTE') {
                        html += '<button class="btn-cita btn-confirmar" onclick="confirmarCita(' + cita.id + ')">Confirmar</button><button class="btn-cita btn-cancelar" onclick="cancelarCita(' + cita.id + ')">Cancelar</button>';
                    }
                    
                    html += '</div></div>';
                }
                container.innerHTML = html;
            }
        }, 500);
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div class="empty-state"><p>Error al cargar las citas</p></div>';
    }
}

function cargarMedicos() {
    var especialidad = especialidadSelect.value;
    
    if (!especialidad) {
        medicoSelect.innerHTML = '<option value="">Primero selecciona especialidad</option>';
        return;
    }
    
    var opciones = '<option value="">Selecciona un medico</option>';
    var medicosList = medicosPorEspecialidad[especialidad] || [];
    
    for (var i = 0; i < medicosList.length; i++) {
        opciones += '<option value="' + medicosList[i].id + '">' + medicosList[i].nombre + '</option>';
    }
    
    medicoSelect.innerHTML = opciones;
}

function cargarHoras() {
    var opciones = '<option value="">Selecciona una hora</option>';
    for (var i = 0; i < horariosDisponibles.length; i++) {
        opciones += '<option value="' + horariosDisponibles[i] + '">' + horariosDisponibles[i] + '</option>';
    }
    horaSelect.innerHTML = opciones;
}

function reservarCita(e) {
    e.preventDefault();
    
    var sede = document.getElementById('sede').value;
    var especialidad = especialidadSelect.value;
    var medico = medicoSelect.value;
    var fecha = fechaInput.value;
    var hora = horaSelect.value;
    
    if (!sede || !especialidad || !medico || !fecha || !hora) {
        mostrarMensaje('Completa todos los campos', 'error');
        return;
    }
    
    mostrarMensaje('Cita agendada correctamente', 'success');
    
    setTimeout(function() {
        cerrarModal();
        cargarCitas();
    }, 2000);
}

function confirmarCita(citaId) {
    alert('Cita ' + citaId + ' confirmada');
    cargarCitas();
}

function cancelarCita(citaId) {
    if (confirm('¿Estas seguro de cancelar esta cita?')) {
        alert('Cita ' + citaId + ' cancelada');
        cargarCitas();
    }
}

function generarTicket(citaId) {
    alert('Ticket generado para la cita ' + citaId);
}

if (btnNuevaCita) {
    btnNuevaCita.addEventListener('click', abrirModal);
}

if (closeModal) {
    closeModal.addEventListener('click', cerrarModal);
}

window.addEventListener('click', function(e) {
    if (e.target === modal) {
        cerrarModal();
    }
});

if (especialidadSelect) {
    especialidadSelect.addEventListener('change', cargarMedicos);
}

if (fechaInput) {
    fechaInput.addEventListener('change', cargarHoras);
}

if (formNuevaCita) {
    formNuevaCita.addEventListener('submit', reservarCita);
}

var tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
if (fechaInput) {
    fechaInput.min = tomorrow.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', function() {
    if (!verificarSesion()) return;
    cargarCitas();
});

window.abrirModal = abrirModal;
window.confirmarCita = confirmarCita;
window.cancelarCita = cancelarCita;
window.generarTicket = generarTicket;