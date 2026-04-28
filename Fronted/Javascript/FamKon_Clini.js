// ========== MANEJO DE NAVEGACIÓN ==========
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

// Toggle mobile menu
navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Cerrar menu al hacer click en un link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        // Actualizar clase active
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    });
});

// ========== SCROLL SUAVE ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ========== DESTACAR LINK ACTIVO AL SCROLL ==========
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    const scrollPosition = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ========== MANEJO DEL FORMULARIO DE CITAS ==========
const appointmentForm = document.getElementById('appointmentForm');
const formMessage = document.getElementById('formMessage');

appointmentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener datos del formulario
    const formData = {
        nombre: document.getElementById('nombre').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        servicio: document.getElementById('servicio').value,
        fecha: document.getElementById('fecha').value
    };
    
    // Validaciones
    if (!formData.nombre || !formData.email || !formData.telefono || !formData.servicio || !formData.fecha) {
        showMessage('Por favor, completa todos los campos', 'error');
        return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showMessage('Por favor, ingresa un email válido', 'error');
        return;
    }
    
    // Validar fecha (no puede ser en el pasado)
    const selectedDate = new Date(formData.fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showMessage('La fecha no puede ser anterior a hoy', 'error');
        return;
    }
    
    // Mostrar mensaje de carga
    const submitBtn = appointmentForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Procesando...';
    submitBtn.disabled = true;
    
    // Simular envío a API (aquí conectarías con tu backend)
    try {
        // Aquí iría la llamada a tu API
        // const response = await fetch('http://localhost:8080/citas', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(formData)
        // });
        
        // Simular respuesta exitosa
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showMessage(' ¡Cita agendada exitosamente! Te contactaremos pronto.', 'success');
        appointmentForm.reset();
        
    } catch (error) {
        showMessage(' Error al agendar la cita. Intenta nuevamente.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Limpiar mensaje después de 5 segundos
        setTimeout(() => {
            if (formMessage) formMessage.innerHTML = '';
        }, 5000);
    }
});

function showMessage(message, type) {
    if (formMessage) {
        formMessage.innerHTML = `<div class="${type}">${message}</div>`;
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ========== ANIMACIONES AL SCROLL ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Aplicar animación a las cards
const cards = document.querySelectorAll('.servicio-card, .doctor-card');
cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'all 0.6s ease';
    observer.observe(card);
});

// ========== FECHA MÍNIMA EN INPUT DATE ==========
const fechaInput = document.getElementById('fecha');
if (fechaInput) {
    const today = new Date().toISOString().split('T')[0];
    fechaInput.min = today;
}

// ========== EFECTO NAVBAR AL SCROLL ==========
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        navbar.style.background = 'rgba(255,255,255,0.98)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        navbar.style.background = 'var(--blanco)';
    }
    
    lastScroll = currentScroll;
});

console.log('🚀 FamKon Clinic - Web cargada exitosamente');