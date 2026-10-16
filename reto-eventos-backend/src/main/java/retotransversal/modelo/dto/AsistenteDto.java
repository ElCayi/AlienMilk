package retotransversal.modelo.dto;

import retotransversal.modelo.entities.Asistente;

/** Un participante, tal como llega del registro de asistencia y como se enseña en el panel. */
public record AsistenteDto(String nombre, String credencial, String procedencia, String incompatibilidades) {

	public static AsistenteDto de(Asistente asistente) {
		return new AsistenteDto(asistente.getNombre(), asistente.getCredencial().name(), asistente.getProcedencia(),
				asistente.getIncompatibilidades());
	}
}
