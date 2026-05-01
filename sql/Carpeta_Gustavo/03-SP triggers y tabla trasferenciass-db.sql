CREATE TABLE dbo.cuentas_bancarias (
    id_cuenta INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    numero_cuenta VARCHAR(20) NOT NULL UNIQUE,
    tipo_cuenta VARCHAR(20) NOT NULL CHECK (tipo_cuenta IN ('AHORRO', 'CORRIENTE', 'MONETARIA')),
    saldo DECIMAL(15,2) NOT NULL DEFAULT 0,
    moneda VARCHAR(3) NOT NULL DEFAULT 'GTQ',
    limite_transferencia DECIMAL(15,2) NOT NULL DEFAULT 10000,
    activa BIT NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT GETDATE(),
    ultimo_movimiento DATETIME NULL,
    CONSTRAINT FK_cuentas_usuario FOREIGN KEY (id_usuario) REFERENCES dbo.ususarios(id_usuario)
);


CREATE INDEX IX_cuentas_usuario ON dbo.cuentas_bancarias(id_usuario);
CREATE INDEX IX_cuentas_numero ON dbo.cuentas_bancarias(numero_cuenta);


CREATE TABLE dbo.transferencias (
    id_transferencia INT IDENTITY(1,1) PRIMARY KEY,
    id_cuenta_origen INT NOT NULL,
    id_cuenta_destino INT NULL,
    numero_cuenta_destino_externo VARCHAR(20) NULL,
    banco_destino_externo VARCHAR(100) NULL,
    tipo_transferencia VARCHAR(20) NOT NULL CHECK (tipo_transferencia IN ('INTERNA', 'EXTERNA', 'PAGO_SERVICIO')),
    monto DECIMAL(15,2) NOT NULL,
    concepto VARCHAR(200) NOT NULL,
    referencia VARCHAR(50) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'FALLIDA', 'CANCELADA')),
    fecha_solicitud DATETIME NOT NULL DEFAULT GETDATE(),
    fecha_completada DATETIME NULL,
    ip_origen VARCHAR(50) NULL,
    user_agent VARCHAR(500) NULL,
    CONSTRAINT FK_transferencias_cuenta_origen FOREIGN KEY (id_cuenta_origen) REFERENCES dbo.cuentas_bancarias(id_cuenta)
);


CREATE INDEX IX_transferencias_origen ON dbo.transferencias(id_cuenta_origen);
CREATE INDEX IX_transferencias_estado ON dbo.transferencias(estado);
CREATE INDEX IX_transferencias_fecha ON dbo.transferencias(fecha_solicitud);


CREATE TABLE dbo.transferencias_detalle (
    id_detalle INT IDENTITY(1,1) PRIMARY KEY,
    id_transferencia INT NOT NULL,
    concepto_detalle VARCHAR(200) NOT NULL,
    monto_desglose DECIMAL(15,2) NOT NULL,
    impuesto DECIMAL(15,2) NOT NULL DEFAULT 0,
    comision DECIMAL(15,2) NOT NULL DEFAULT 0,
    CONSTRAINT FK_transferencias_detalle_transferencia FOREIGN KEY (id_transferencia) REFERENCES dbo.transferencias(id_transferencia)
);


CREATE TABLE dbo.saldos_historial (
    id_historial INT IDENTITY(1,1) PRIMARY KEY,
    id_cuenta INT NOT NULL,
    saldo_anterior DECIMAL(15,2) NOT NULL,
    saldo_nuevo DECIMAL(15,2) NOT NULL,
    cambio DECIMAL(15,2) NOT NULL,
    id_transferencia INT NULL,
    fecha_cambio DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_historial_cuenta FOREIGN KEY (id_cuenta) REFERENCES dbo.cuentas_bancarias(id_cuenta),
    CONSTRAINT FK_historial_transferencia FOREIGN KEY (id_transferencia) REFERENCES dbo.transferencias(id_transferencia)
);

CREATE INDEX IX_historial_cuenta ON dbo.saldos_historial(id_cuenta);
CREATE INDEX IX_historial_fecha ON dbo.saldos_historial(fecha_cambio);

-- Tabla de métodos de pago guardados (opcional)
CREATE TABLE dbo.metodos_pago (
    id_metodo INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'TARJETA', 'PAYPAL', 'CUENTA_BANCO'
    ultimos_digitos VARCHAR(4) NULL, -- Solo últimos 4 dígitos
    nombre_titular VARCHAR(100) NULL,
    expiracion_mes INT NULL,
    expiracion_anio INT NULL,
    activo BIT DEFAULT 1,
    FOREIGN KEY (id_usuario) REFERENCES dbo.ususarios(id_usuario)
);



---Insert de algunas cuentas bancarias para hacer las pruebas
INSERT INTO dbo.cuentas_bancarias (
    id_usuario,
    numero_cuenta,
    tipo_cuenta,
    saldo,
    moneda,
    limite_transferencia,
    activa,
    fecha_creacion,
    ultimo_movimiento
)
VALUES (
    1, -- id_usuario (asumiendo que el usuario administrador de FamKon tiene ID 1)
    '3051234567890123456', -- Número de cuenta (16 dígitos + código de banco)
    'CORRIENTE',
    10000.00, -- Saldo inicial Q10,000.00
    'GTQ',
    25000.00, -- Límite de transferencia diario Q25,000
    1, -- Cuenta activa
    GETDATE(),
    NULL
);

CREATE TABLE ClinicaF.dbo.tarjetas_cuenta (
    id_tarjeta INT IDENTITY(1,1) PRIMARY KEY,
    id_cuenta INT NOT NULL,
    numero_tarjeta VARCHAR(16) NOT NULL,  -- Últimos 4 dígitos o enmascarado
    titular_nombre VARCHAR(100) NOT NULL,
    fecha_expiracion DATE NOT NULL,  -- Fecha de expiración de la tarjeta
    cvv_encrypted VARBINARY(256) NOT NULL,  -- CVV encriptado
    tipo_tarjeta VARCHAR(20) CHECK (tipo_tarjeta IN ('CREDITO', 'DEBITO')),
    marca VARCHAR(20) CHECK (marca IN ('VISA', 'MASTERCARD', 'AMEX')),
    es_principal BIT DEFAULT 0,
    activa BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_tarjeta_cuenta FOREIGN KEY (id_cuenta) 
        REFERENCES ClinicaF.dbo.cuentas_bancarias(id_cuenta),
    CONSTRAINT UQ_tarjeta_numero UNIQUE (numero_tarjeta)
);

CREATE INDEX IX_tarjetas_cuenta ON ClinicaF.dbo.tarjetas_cuenta(id_cuenta, activa);

CREATE TABLE dbo.tarjetas (
    id_tarjeta INT IDENTITY(1,1) PRIMARY KEY,
    id_cuenta INT NOT NULL,
    numero_tarjeta VARCHAR(16) NOT NULL UNIQUE,
    titular_nombre VARCHAR(100) NOT NULL,
    fecha_expiracion DATE NOT NULL,
    cvv VARCHAR(4) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('CREDITO', 'DEBITO')),
    activa BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_tarjetas_cuentas FOREIGN KEY (id_cuenta) REFERENCES dbo.cuentas_bancarias(id_cuenta)
);


INSERT INTO dbo.cuentas_bancarias (id_usuario, numero_cuenta, tipo_cuenta, saldo)
SELECT id_usuario, 'GTQ' + CAST(id_usuario AS VARCHAR), 'MONETARIA', 5000.00
FROM dbo.ususarios
WHERE id_usuario = 1;

-- Insertar tarjeta
INSERT INTO dbo.tarjetas (id_cuenta, numero_tarjeta, titular_nombre, fecha_expiracion, cvv, tipo)
SELECT 
    id_cuenta,
    '4532015112830366',
    (SELECT nombres + ' ' + apellidos FROM dbo.ususarios WHERE id_usuario = 1),
    '2026-12-31',
    '123',
    'DEBITO'
FROM dbo.cuentas_bancarias
WHERE id_usuario = 1;


SELECT * FROM dbo.cuentas_bancarias;
SELECT * FROM dbo.tarjetas_cuenta;
SELECT * FROM dbo.ususarios WHERE id_usuario = 1;




-- Insertar tarjetas para la cuenta del usuario (id_cuenta = 2)
INSERT INTO dbo.tarjetas_cuenta (
    id_cuenta, 
    numero_tarjeta, 
    titular_nombre, 
    fecha_expiracion, 
    cvv_encrypted, 
    tipo_tarjeta, 
    marca, 
    es_principal, 
    activa
)
VALUES 
(
    2,  -- id_cuenta de GTQ1
    '4532015112830366',
    'Gustavo Adolfo Tobias Ramirez',
    '2026-12-31',
    CAST('123' AS VARBINARY(256)),
    'DEBITO',
    'VISA',
    1,  -- es principal
    1   -- activa
),
(
    2,
    '4916123456789012',
    'Gustavo Adolfo Tobias Ramirez',
    '2025-06-30',
    CAST('456' AS VARBINARY(256)),
    'CREDITO',
    'MASTERCARD',
    0,  -- no es principal
    1   -- activa
);

-- Verificar que se insertaron
SELECT * FROM dbo.tarjetas_cuenta;



-- Actualizar CVV encriptado
UPDATE dbo.tarjetas_cuenta 
SET cvv_encrypted = CAST('123' AS VARBINARY(256))
WHERE numero_tarjeta = '4532015112830366';

UPDATE dbo.tarjetas_cuenta 
SET cvv_encrypted = CAST('456' AS VARBINARY(256))
WHERE numero_tarjeta = '4916123456789012';



SELECT 
    t.id_tarjeta,
    t.id_cuenta,
    t.numero_tarjeta,
    t.titular_nombre,
    t.fecha_expiracion,
    t.activa,
    c.id_usuario,
    c.numero_cuenta,
    c.activa as cuenta_activa
FROM dbo.tarjetas_cuenta t
INNER JOIN dbo.cuentas_bancarias c ON t.id_cuenta = c.id_cuenta
WHERE t.numero_tarjeta = '4532015112830366';


-- Ver CVV (debe mostrar '123')
SELECT 
    numero_tarjeta,
    CAST(cvv_encrypted AS VARCHAR(4)) as cvv_texto
FROM dbo.tarjetas_cuenta
WHERE numero_tarjeta = '4532015112830366';

-- Ver el código del SP actual
EXEC sp_helptext 'sp_pagar_con_tarjeta';


DECLARE @id_cuenta_origen INT;
DECLARE @fecha_expiracion DATE;
DECLARE @cvv_real VARCHAR(4);
DECLARE @id_usuario INT = 1;
DECLARE @numero_tarjeta VARCHAR(16) = '4532015112830366';

SELECT TOP 1 @id_cuenta_origen = t.id_cuenta, 
       @fecha_expiracion = t.fecha_expiracion,
       @cvv_real = CAST(t.cvv_encrypted AS VARCHAR(4))
FROM dbo.tarjetas_cuenta t
INNER JOIN dbo.cuentas_bancarias c ON t.id_cuenta = c.id_cuenta
WHERE t.numero_tarjeta = @numero_tarjeta 
  AND t.activa = 1
  AND c.id_usuario = @id_usuario
  AND c.activa = 1;

SELECT @id_cuenta_origen as id_cuenta, @fecha_expiracion, @cvv_real as cvv;




DECLARE @resultado INT, @mensaje VARCHAR(200);

-- Usando cuenta bancaria directamente
EXEC dbo.sp_realizar_transferencia_famkon 
    @id_usuario_origen = 1,
    @numero_cuenta_origen = 'GTQ1',
    @monto = 100.00,
    @concepto = 'Pago de consulta médica',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado AS Resultado, @mensaje AS Mensaje;

-- Usando tarjeta
EXEC dbo.sp_pagar_con_tarjeta_famkon
    @id_usuario = 1,
    @numero_tarjeta = '4532015112830366',
    @cvv = '123',
    @monto = 50.00,
    @concepto = 'Pago servicio médico',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado AS Resultado, @mensaje AS Mensaje;

---

-- Ver la definición de la restricción CHECK
SELECT 
    OBJECT_NAME(parent_object_id) AS tabla,
    name AS nombre_restriccion,
    definition AS definicion
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.transferencias')
  AND name LIKE '%tipo%';

-- Primero, eliminar la restricción existente
ALTER TABLE dbo.transferencias 
DROP CONSTRAINT CK__transfere__tipo___74AE54BC;

-- Crear la restricción con los nuevos valores permitidos
ALTER TABLE dbo.transferencias 
ADD CONSTRAINT CK_transferencias_tipo CHECK (
    tipo_transferencia IN (
        'TRANSFERENCIA', 
        'PAGO_SERVICIO', 
        'TRANSFERENCIA_FAMKON', 
        'PAGO_FAMKON',
        'TRANSFERENCIA_INTERNA'
    )
);





DECLARE @resultado INT, @mensaje VARCHAR(200);

-- Prueba con cuenta bancaria
EXEC dbo.sp_realizar_transferencia_famkon 
    @id_usuario_origen = 1,
    @numero_cuenta_origen = 'GTQ1',
    @monto = 100.00,
    @concepto = 'Pago de consulta médica',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado AS Resultado, @mensaje AS Mensaje;

-- Prueba con tarjeta de débito
EXEC dbo.sp_pagar_con_tarjeta_famkon
    @id_usuario = 1,
    @numero_tarjeta = '4532015112830366',
    @cvv = '123',
    @monto = 50.00,
    @concepto = 'Pago servicio médico',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado AS Resultado, @mensaje AS Mensaje;



-- Verificar qué cuentas tiene el usuario
SELECT 
    id_cuenta,
    id_usuario,
    numero_cuenta,
    tipo_cuenta,
    saldo,
    activa
FROM dbo.cuentas_bancarias
WHERE id_usuario = 1;






-- Probar historial para usuario id=1 (Gustavo)
EXEC dbo.sp_historial_transacciones_usuario 
    @id_usuario = 1,
    @limite = 20,
    @offset = 0;


-- Ver la estructura de la tabla ususarios
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ususarios' AND TABLE_SCHEMA = 'dbo';

---Prueba 2

DECLARE @resultado INT, @mensaje VARCHAR(200);

-- Transferencia bancaria con IP
EXEC dbo.sp_realizar_transferencia_famkon 
    @id_usuario_origen = 1,
    @numero_cuenta_origen = 'GTQ1',
    @monto = 75.00,
    @concepto = 'Pago consulta especialista',
    @ip_origen = '192.168.1.150',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado, @mensaje;

-- Pago con tarjeta con IP
EXEC dbo.sp_pagar_con_tarjeta_famkon
    @id_usuario = 1,
    @numero_tarjeta = '4532015112830366',
    @cvv = '123',
    @monto = 60.00,
    @concepto = 'Pago servicio',
    @ip_origen = '192.168.1.150',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado, @mensaje;



----

-- Prueba con el email de tu usuario
DECLARE @resultado INT;
DECLARE @mensaje VARCHAR(200);

EXEC dbo.sp_pagar_con_tarjeta_famkon
    @email = 'tobiasgusito@gmail.com',
    @telefono = NULL,
    @numero_tarjeta = '4532015112830366',
    @nombre_titular = 'Gustavo Adolfo Tobias Ramirez',
    @fecha_expiracion = '12/26',
    @cvv = '123',
    @monto = 100.00,
    @concepto = 'Pago consulta médica',
    @ip_origen = '192.168.1.100',
    @resultado = @resultado OUTPUT,
    @mensaje = @mensaje OUTPUT;

SELECT @resultado AS Resultado, @mensaje AS Mensaje;



*---verificacion en la cuenta de famkon

-- 1. Ver los saldos actualizados
SELECT 
    cb.id_cuenta,
    cb.numero_cuenta,
    cb.tipo_cuenta,
    cb.saldo,
    cb.ultimo_movimiento,
    u.nombres,
    u.apellidos,
    u.email
FROM dbo.cuentas_bancarias cb
INNER JOIN dbo.ususarios u ON cb.id_usuario = u.id_usuario
WHERE u.email = 'tobiasgusito@gmail.com' OR cb.numero_cuenta = 'FAMKON0001';

-- 2. Ver la última transferencia realizada
SELECT TOP 1 
    t.id_transferencia,
    t.monto,
    t.concepto,
    t.referencia,
    t.fecha_completada,
    t.estado,
    c_origen.numero_cuenta AS cuenta_origen,
    c_destino.numero_cuenta AS cuenta_destino
FROM dbo.transferencias t
INNER JOIN dbo.cuentas_bancarias c_origen ON t.id_cuenta_origen = c_origen.id_cuenta
INNER JOIN dbo.cuentas_bancarias c_destino ON t.id_cuenta_destino = c_destino.id_cuenta
ORDER BY t.id_transferencia DESC;

-- 3. Ver el log del pago
SELECT TOP 1 
    id_log,
    fecha,
    tipo_accion,
    usuario_afectado_id,
    usuario_afectado_email,
    accion_realizada,
    ip_origen,
    detalles
FROM dbo.logs_usuarios
WHERE tipo_accion = 'PAGO_EXITOSO'
ORDER BY id_log DESC;






