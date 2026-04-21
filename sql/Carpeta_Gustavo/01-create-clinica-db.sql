IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ClinicaDB')
BEGIN
    CREATE DATABASE ClinicaDB;
    PRINT 'Base de datos ClinicaDB creada exitosamente';
END
GO

USE ClinicaDB;
GO