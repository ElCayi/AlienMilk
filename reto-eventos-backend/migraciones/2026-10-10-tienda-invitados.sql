-- Tienda: pedidos sin cuenta. Un pedido de invitado no tiene usuario; guarda a quién avisar y la
-- huella (SHA-256) de la clave de su enlace privado. La clave en claro solo la ve el comprador.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-10-tienda-invitados.sql

ALTER TABLE pedidos
	MODIFY username VARCHAR(45) NULL,
	ADD COLUMN IF NOT EXISTS nombre VARCHAR(80) AFTER username,
	ADD COLUMN IF NOT EXISTS correo VARCHAR(120) AFTER nombre,
	ADD COLUMN IF NOT EXISTS clave_hash CHAR(64) AFTER correo;

-- O es de una cuenta, o lleva todo lo que necesita un invitado para volver a encontrarlo.
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS ck_pedido_comprador;
ALTER TABLE pedidos ADD CONSTRAINT ck_pedido_comprador CHECK (
	username IS NOT NULL OR (nombre IS NOT NULL AND correo IS NOT NULL AND clave_hash IS NOT NULL));
