-- Control de ingreso en pantalla: cada participante registrado guarda cuándo entró, y las reservas sin
-- participantes registrados, cuántas de sus plazas han entrado. Ausente es quien no entró y la sesión
-- acabó: no se guarda. Va después de 2026-10-17-reservas-pago.sql.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-17-control-ingreso.sql

ALTER TABLE asistentes ADD COLUMN IF NOT EXISTS entrada_en DATETIME AFTER incompatibilidades;

ALTER TABLE reservas
	ADD COLUMN IF NOT EXISTS entradas_sin_registrar INT NOT NULL DEFAULT 0 AFTER importe_devuelto;
