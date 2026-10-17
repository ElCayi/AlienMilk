-- Reservas: cancelar ya no borra. Una reserva cancelada libera sus plazas y se queda en el historial con
-- cuándo se canceló, quién lo hizo (el cliente desde su cuenta o AlienMilk desde el panel) y el motivo,
-- obligatorio desde el panel. Las reservas que ya existen siguen vivas.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-17-reservas-cancelacion.sql

ALTER TABLE reservas
	ADD COLUMN IF NOT EXISTS cancelada_en DATETIME AFTER conformidad_en,
	ADD COLUMN IF NOT EXISTS cancelada_por VARCHAR(20) AFTER cancelada_en,
	ADD COLUMN IF NOT EXISTS motivo_cancelacion VARCHAR(200) AFTER cancelada_por;
