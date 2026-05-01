
-- Probar historial para usuario id=1 (Gustavo)
EXEC dbo.sp_historial_transacciones_usuario 
    @id_usuario = 1,
    @limite = 20,
    @offset = 0;


-- Prueba con un monto
DECLARE @res INT;
DECLARE @msg VARCHAR(200);

EXEC dbo.sp_pagar_con_tarjeta_famkon
    @email = 'tobiasgusito@gmail.com',
    @telefono = NULL,
    @numero_tarjeta = '4532015112830366',
    @nombre_titular = 'Gustavo Adolfo Tobias Ramirez',
    @fecha_expiracion = '12/26',
    @cvv = '123',
    @monto = 50.00,
    @concepto = 'Pago consulta médica',
    @ip_origen = '192.168.1.100',
    @resultado = @res OUTPUT,
    @mensaje = @msg OUTPUT;

SELECT @res AS Resultado, @msg AS Mensaje;

-- Verificar saldos
SELECT numero_cuenta, saldo FROM dbo.cuentas_bancarias WHERE numero_cuenta IN ('GTQ1', 'FAMKON0001');