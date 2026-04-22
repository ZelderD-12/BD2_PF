IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ClinicaDB')
BEGIN
    CREATE DATABASE ClinicaDB;
    PRINT 'Base de datos ClinicaDB creada exitosamente';
END
GO

USE ClinicaDB;
GO

CREATE TABLE ClinicaDB.dbo.[roles] (
    Idrol tinyint IDENTITY(1,1) NOT NULL,
    rol varchar(100) NOT NULL,
    CONSTRAINT role_pk PRIMARY KEY (Idrol)
);
GO

