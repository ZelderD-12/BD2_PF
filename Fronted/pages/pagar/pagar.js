// pages/pagar/pagar.js
(function() {
    'use strict';
    
    console.log('🔍 Iniciando script de pago...');

    const formPago = document.getElementById('formPago');
    const btnPagar = document.getElementById('btnPagar');
    const mensajeDiv = document.getElementById('mensajePago');

    function mostrarMensaje(mensaje, tipo) {
        if (!mensajeDiv) return;
        mensajeDiv.innerHTML = `<i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${mensaje}`;
        mensajeDiv.className = `mensaje-pago ${tipo}`;
        mensajeDiv.style.display = 'block';
        
        setTimeout(() => {
            if (mensajeDiv) mensajeDiv.style.display = 'none';
        }, 5000);
    }

    // Formatear número de tarjeta
    const numeroTarjeta = document.getElementById('numeroTarjeta');
    if (numeroTarjeta) {
        numeroTarjeta.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            let formatted = '';
            for (let i = 0; i < value.length && i < 16; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += value[i];
            }
            e.target.value = formatted;
        });
    }

    // Formatear fecha
    const fechaExpiracion = document.getElementById('fechaExpiracion');
    if (fechaExpiracion) {
        fechaExpiracion.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
            } else {
                e.target.value = value;
            }
        });
    }

    // Limitar CVV
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }

    // Enviar pago
    if (formPago) {
        formPago.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('Formulario enviado');
            
            // Obtener valores
            const nombre = document.getElementById('nombreTitular')?.value.trim();
            const numero = document.getElementById('numeroTarjeta')?.value.replace(/\s/g, '');
            const fecha = document.getElementById('fechaExpiracion')?.value;
            const cvv = document.getElementById('cvv')?.value;
            const email = document.getElementById('email')?.value.trim();
            const telefono = document.getElementById('telefono')?.value.trim();
            const metodoPago = document.getElementById('metodoPago')?.value;
            
            // Obtener monto del DOM
            const montoTexto = document.getElementById('montoPago')?.textContent.replace('Q', '').replace(/,/g, '') || '0';
            const monto = parseFloat(montoTexto);
            const concepto = document.getElementById('tituloPago')?.textContent || 'Pago';
            
            console.log('Datos del formulario:', { nombre, numero, fecha, cvv, email, telefono, metodoPago, monto, concepto });
            
            // Validaciones
            if (!email && !telefono) {
                mostrarMensaje('Ingresa correo electrónico o teléfono', 'error');
                return;
            }
            
            if (!nombre) {
                mostrarMensaje('Ingresa el nombre del titular', 'error');
                return;
            }
            
            if (!numero || numero.length !== 16) {
                mostrarMensaje('Número de tarjeta inválido (16 dígitos)', 'error');
                return;
            }
            
            if (!fecha || fecha.length !== 5) {
                mostrarMensaje('Fecha de expiración inválida (MM/YY)', 'error');
                return;
            }
            
            if (!cvv || cvv.length < 3) {
                mostrarMensaje('CVV inválido (3-4 dígitos)', 'error');
                return;
            }
            
            if (isNaN(monto) || monto <= 0) {
                mostrarMensaje('Monto inválido', 'error');
                return;
            }
            
            // Guardar email
            if (email) localStorage.setItem('user_email', email);
            
            // Cambiar estado del botón
            const originalText = btnPagar.innerHTML;
            btnPagar.disabled = true;
            btnPagar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            
            try {
                const servicioId = localStorage.getItem('pago_servicio_id');
                const citaId = localStorage.getItem('pago_cita_id');
                
                const result = await window.api.pagarConTarjeta({
                    email: email,
                    telefono: telefono,
                    numero_tarjeta: numero,
                    nombre_titular: nombre,
                    fecha_expiracion: fecha,
                    cvv: cvv,
                    monto: monto,
                    concepto: concepto,
                    id_cita: citaId ? parseInt(citaId) : null,
                    id_servicio: servicioId ? parseInt(servicioId) : 1
                });
                
                if (result && result.success) {
                    mostrarMensaje(result.mensaje || '✅ Pago exitoso!', 'success');
                    
                    // Limpiar datos guardados
                    localStorage.removeItem('pago_servicio_id');
                    localStorage.removeItem('pago_tipo_servicio');
                    localStorage.removeItem('pago_cita_id');
                    
                    setTimeout(() => {
                        window.location.href = '/FamKon_Clinic.html?pago=exitoso';
                    }, 2000);
                } else {
                    const errorMsg = result?.error || '❌ Error en el pago';
                    mostrarMensaje(errorMsg, 'error');
                    btnPagar.disabled = false;
                    btnPagar.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarMensaje(`Error: ${error.message}`, 'error');
                btnPagar.disabled = false;
                btnPagar.innerHTML = originalText;
            }
        });
    }
})();