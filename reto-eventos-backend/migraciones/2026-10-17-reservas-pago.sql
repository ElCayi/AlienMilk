-- Reservas: cobro con Stripe. Las hechas en la web quedan pendientes de pago (guardan sus plazas 30
-- minutos) hasta que se pagan; las del panel se pagan en taquilla. Las devoluciones se guardan como
-- importe devuelto, porque pueden ser parciales. Las reservas que ya existen quedan como pagadas.
-- Va después de 2026-10-17-reservas-cancelacion.sql.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-17-reservas-pago.sql

ALTER TABLE reservas
	ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'PAGADA' AFTER motivo_cancelacion,
	ADD COLUMN IF NOT EXISTS pago_sesion VARCHAR(100) AFTER estado_pago,
	ADD COLUMN IF NOT EXISTS pago_url VARCHAR(500) AFTER pago_sesion,
	ADD COLUMN IF NOT EXISTS pago_caduca_en DATETIME AFTER pago_url,
	ADD COLUMN IF NOT EXISTS pago_id VARCHAR(100) AFTER pago_caduca_en,
	ADD COLUMN IF NOT EXISTS pagada_en DATETIME AFTER pago_id,
	ADD COLUMN IF NOT EXISTS importe_devuelto DECIMAL(9,2) NOT NULL DEFAULT 0 AFTER pagada_en;

CREATE INDEX IF NOT EXISTS ix_reservas_pago_sesion ON reservas (pago_sesion);
