-- Tienda: cobro con Stripe Checkout. Un pedido nace PENDIENTE_PAGO, con sus unidades reservadas, y
-- pasa a CONFIRMADO cuando Stripe confirma el pago; si nadie paga en 30 minutos, se anula solo.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-12-tienda-pagos.sql

ALTER TABLE pedidos
	MODIFY estado VARCHAR(16) NOT NULL,
	ADD COLUMN IF NOT EXISTS pago_sesion VARCHAR(255) AFTER anulado_en,
	ADD COLUMN IF NOT EXISTS pago_url VARCHAR(1024) AFTER pago_sesion,
	ADD COLUMN IF NOT EXISTS pago_caduca_en DATETIME AFTER pago_url,
	ADD COLUMN IF NOT EXISTS pago_id VARCHAR(255) AFTER pago_caduca_en,
	ADD COLUMN IF NOT EXISTS pagado_en DATETIME AFTER pago_id,
	ADD COLUMN IF NOT EXISTS reembolso_id VARCHAR(255) AFTER pagado_en,
	ADD UNIQUE INDEX IF NOT EXISTS uk_pedidos_pago_sesion (pago_sesion),
	ADD INDEX IF NOT EXISTS idx_pedidos_pendientes (estado, pago_caduca_en);

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS ck_pedido_estado;
ALTER TABLE pedidos ADD CONSTRAINT ck_pedido_estado
	CHECK (estado IN ('PENDIENTE_PAGO', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'ANULADO'));
