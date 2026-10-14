-- Sesiones: archivo del panel. Las canceladas o terminadas se pueden archivar desde /admin para
-- sacarlas de la lista; quedan en el filtro «Archivadas». No cambia nada en la web ni en las reservas.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-14-sesiones-archivo.sql

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS archivada BOOLEAN NOT NULL DEFAULT FALSE AFTER imagen;
