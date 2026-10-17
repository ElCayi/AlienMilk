-- Reservas: la revisión de las adaptaciones y el material se cierra. AlienMilk las acepta o no, con una
-- nota que ve el cliente; si cambian, vuelven a revisarse. Sin decisión, siguen pendientes (como hasta
-- ahora). Va después de 2026-10-17-control-ingreso.sql.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-17-revision.sql

ALTER TABLE reservas
	ADD COLUMN IF NOT EXISTS revision_aceptada BOOLEAN AFTER conformidad_en,
	ADD COLUMN IF NOT EXISTS revision_nota VARCHAR(300) AFTER revision_aceptada,
	ADD COLUMN IF NOT EXISTS revisada_en DATETIME AFTER revision_nota;
