package retotransversal.modelo.dto;

import java.util.Map;

/**
 * Todas las capas del expediente, como las compone la ficha pública: la general, las de cada tipo
 * (por el nombre del tipo, como llega en las sesiones) y las de cada sesión (por su id).
 */
public record ExpedientesDto(
		ExpedienteCapaDto general,
		Map<String, ExpedienteCapaDto> porTipo,
		Map<String, ExpedienteCapaDto> porSesion) {
}
