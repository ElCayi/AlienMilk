package retotransversal.modelo.dto;

/**
 * Cifras de la cabecera del panel de administración: lo que hay en marcha y lo que espera a alguien.
 * Los dos últimos son también los avisos del menú lateral.
 */
public record ResumenAdminDto(
		long sesionesActivas,
		long plazasReservadas,
		long pedidosPorPreparar,
		long solicitudesNuevas) {
}
