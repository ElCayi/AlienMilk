package retotransversal.modelo.entities;

/**
 * Quién canceló una reserva: el propio cliente desde su cuenta, AlienMilk desde el panel, o el sistema
 * (un pago que no se completó a tiempo, una sesión cancelada que se reactiva tras devolver el dinero).
 */
public enum CanceladaPor {
	CLIENTE,
	ALIENMILK,
	SISTEMA
}
