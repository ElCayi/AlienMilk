-- Reservas sin cuenta: por teléfono, a nombre de quien llama (con su teléfono y, si lo da, su correo).
-- Las de cuentas borradas se quedan igual, a nombre de la persona, en vez de borrarse con la cuenta.
-- Va después de 2026-10-17-devoluciones.sql.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-17-reservas-sin-cuenta.sql

ALTER TABLE reservas MODIFY username VARCHAR(45) NULL;

ALTER TABLE reservas
	ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(120) AFTER username,
	ADD COLUMN IF NOT EXISTS cliente_correo VARCHAR(120) AFTER cliente_nombre;
