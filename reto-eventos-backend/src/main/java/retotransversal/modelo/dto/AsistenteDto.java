package retotransversal.modelo.dto;

import java.time.LocalDateTime;

import retotransversal.modelo.entities.Asistente;

/**
 * Un participante, tal como llega del registro de asistencia y como se enseña en el panel. La entrada
 * solo se lee: se marca aparte, en el control de ingreso (ver ReservaService#marcarEntrada).
 */
public record AsistenteDto(String nombre, String credencial, String procedencia, String incompatibilidades,
		LocalDateTime entradaEn) {

	public AsistenteDto(String nombre, String credencial, String procedencia, String incompatibilidades) {
		this(nombre, credencial, procedencia, incompatibilidades, null);
	}

	public static AsistenteDto de(Asistente asistente) {
		return new AsistenteDto(asistente.getNombre(), asistente.getCredencial().name(), asistente.getProcedencia(),
				asistente.getIncompatibilidades(), asistente.getEntradaEn());
	}
}
