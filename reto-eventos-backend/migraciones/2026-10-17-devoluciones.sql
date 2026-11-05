-- Reservas: cada devolución con su propio registro (importe, medio, estado, motivo, referencia de Stripe
-- y fechas). Las de tarjeta quedan hechas al momento; las de taquilla, pendientes hasta que se entregan.
-- Las devoluciones anteriores se pasan al registro como hechas. Va después de 2026-10-17-revision.sql.
-- Idempotente: se puede aplicar sobre una base existente tantas veces como haga falta.
--   mariadb reserva_eventos_bbdd < reto-eventos-backend/migraciones/2026-10-17-devoluciones.sql

CREATE TABLE IF NOT EXISTS devoluciones (
	id_devolucion INT AUTO_INCREMENT PRIMARY KEY,
	id_reserva INT NOT NULL,
	importe DECIMAL(9,2) NOT NULL,
	medio VARCHAR(10) NOT NULL,
	estado VARCHAR(10) NOT NULL,
	motivo VARCHAR(120) NOT NULL,
	referencia VARCHAR(100),
	creada_en DATETIME NOT NULL,
	hecha_en DATETIME,
	CONSTRAINT fk_devoluciones_reservas
		FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE
);

INSERT INTO devoluciones (id_reserva, importe, medio, estado, motivo, creada_en, hecha_en)
SELECT r.id_reserva, r.importe_devuelto,
	IF(r.estado_pago = 'COBRADA_TAQUILLA', 'TAQUILLA', 'TARJETA'), 'HECHA',
	'Anterior al registro de devoluciones', COALESCE(r.cancelada_en, NOW()), COALESCE(r.cancelada_en, NOW())
FROM reservas r
WHERE r.importe_devuelto > 0
	AND NOT EXISTS (SELECT 1 FROM devoluciones d WHERE d.id_reserva = r.id_reserva);
