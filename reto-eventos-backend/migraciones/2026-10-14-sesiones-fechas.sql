-- Sesiones: el backend da por terminadas cada noche las sesiones activas cuya fecha ya pasó
-- (CierreSesiones). Las cinco de ejemplo eran de mayo a julio de 2026 y se quedarían todas terminadas,
-- con la web pública sin programa: aquí pasan seis meses más tarde, en el mismo orden.
-- Aplicar ANTES de desplegar el backend con el cierre automático.
-- Idempotente: solo mueve las que conservan su nombre y su fecha original; si una ya se cambió a
-- mano (desde el panel, por ejemplo), se respeta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-14-sesiones-fechas.sql

UPDATE eventos SET fecha_inicio = '2026-11-20' WHERE nombre = 'Cata de Leche Abducida' AND fecha_inicio = '2026-05-20';
UPDATE eventos SET fecha_inicio = '2026-11-28' WHERE nombre = 'Abduccion Suave para Principiantes' AND fecha_inicio = '2026-05-28';
UPDATE eventos SET fecha_inicio = '2026-12-10' WHERE nombre = 'Taller de Espuma Galactica' AND fecha_inicio = '2026-06-10';
UPDATE eventos SET fecha_inicio = '2026-11-18' WHERE nombre = 'Ruta Nocturna por el Hangar' AND fecha_inicio = '2026-05-18';
UPDATE eventos SET fecha_inicio = '2027-01-01' WHERE nombre = 'Sesion Eclipse Lunar' AND fecha_inicio = '2026-07-01';
