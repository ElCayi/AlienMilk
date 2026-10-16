-- Reservas: registro de asistencia. Cada reserva hecha desde la web identifica a sus participantes (uno
-- por plaza, con la credencial que presentarán y su procedencia), deja un teléfono para los avisos del
-- mismo día, pide adaptaciones o material externo si hace falta (entonces requiere revisión) y guarda
-- cuándo se aceptaron la edad mínima y las condiciones. Las cuentas guardan aparte si quieren recibir el
-- programa. Las reservas que ya existen quedan con sus participantes sin registrar.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-16-reservas-asistencia.sql

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acepta_comunicaciones BOOLEAN NOT NULL DEFAULT FALSE AFTER enabled;

ALTER TABLE reservas
	ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) AFTER cantidad,
	ADD COLUMN IF NOT EXISTS adaptaciones VARCHAR(500) AFTER telefono,
	ADD COLUMN IF NOT EXISTS material_externo BOOLEAN NOT NULL DEFAULT FALSE AFTER adaptaciones,
	ADD COLUMN IF NOT EXISTS material_descripcion VARCHAR(500) AFTER material_externo,
	ADD COLUMN IF NOT EXISTS conformidad_en DATETIME AFTER material_descripcion;

CREATE TABLE IF NOT EXISTS asistentes (
	id_asistente INT AUTO_INCREMENT PRIMARY KEY,
	id_reserva INT NOT NULL,
	orden INT NOT NULL,
	nombre VARCHAR(80) NOT NULL,
	credencial VARCHAR(30) NOT NULL,
	procedencia VARCHAR(80),
	incompatibilidades VARCHAR(300),
	CONSTRAINT fk_asistentes_reservas
		FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE
);
