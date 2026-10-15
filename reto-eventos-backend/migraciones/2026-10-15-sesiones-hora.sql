-- Sesiones: hora de inicio obligatoria. Hasta ahora la hora solo vivía, opcional y en texto libre, en el
-- «horario» del expediente; pasa a ser un dato de la sesión, y el horario (19:15 – 21:45) sale de la hora
-- y la duración. Las cinco sesiones de partida toman la hora de su expediente y una duración que cuadra
-- con él; las demás, las 19:00 hasta que se cambie en /admin. Al final se quita «horario» de los expedientes.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-15-sesiones-hora.sql

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS hora_inicio TIME NULL AFTER fecha_inicio;

UPDATE eventos SET hora_inicio = '19:15:00', duracion = 150 WHERE hora_inicio IS NULL AND nombre = 'Cata de Leche Abducida' AND duracion = 120;
UPDATE eventos SET hora_inicio = '18:30:00', duracion = 130 WHERE hora_inicio IS NULL AND nombre = 'Abduccion Suave para Principiantes' AND duracion = 100;
UPDATE eventos SET hora_inicio = '17:30:00', duracion = 165 WHERE hora_inicio IS NULL AND nombre = 'Taller de Espuma Galactica' AND duracion = 150;
UPDATE eventos SET hora_inicio = '22:30:00', duracion = 105 WHERE hora_inicio IS NULL AND nombre = 'Ruta Nocturna por el Hangar' AND duracion = 90;
UPDATE eventos SET hora_inicio = '21:00:00', duracion = 170 WHERE hora_inicio IS NULL AND nombre = 'Sesion Eclipse Lunar' AND duracion = 180;
UPDATE eventos SET hora_inicio = '19:00:00' WHERE hora_inicio IS NULL;

ALTER TABLE eventos MODIFY hora_inicio TIME NOT NULL;

UPDATE expedientes SET contenido = JSON_REMOVE(contenido, '$.horario') WHERE JSON_EXISTS(contenido, '$.horario');
