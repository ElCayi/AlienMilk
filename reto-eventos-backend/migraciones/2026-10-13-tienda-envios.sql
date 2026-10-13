-- Tienda: gestión de pedidos desde /admin. Guarda cuándo salió cada pedido del centro de distribución
-- y cuándo se entregó (o se recogió en la sede).
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-13-tienda-envios.sql

ALTER TABLE pedidos
	ADD COLUMN IF NOT EXISTS enviado_en DATETIME AFTER reembolso_id,
	ADD COLUMN IF NOT EXISTS entregado_en DATETIME AFTER enviado_en;
