-- Solicitudes enviadas desde los formularios públicos (de momento, los de los operadores asociados).
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-07-solicitudes.sql

CREATE TABLE IF NOT EXISTS solicitudes (
	id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
	referencia VARCHAR(20) UNIQUE,
	formulario VARCHAR(60) NOT NULL,
	asunto VARCHAR(160) NOT NULL,
	nombre VARCHAR(120) NOT NULL,
	email VARCHAR(120) NOT NULL,
	datos TEXT NOT NULL,
	estado VARCHAR(12) NOT NULL DEFAULT 'NUEVA',
	creada_en DATETIME NOT NULL,
	atendida_en DATETIME,
	INDEX ix_solicitudes_creada_en (creada_en)
);
