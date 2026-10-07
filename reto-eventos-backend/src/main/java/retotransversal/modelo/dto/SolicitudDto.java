package retotransversal.modelo.dto;

import java.time.LocalDateTime;
import java.util.List;

import retotransversal.modelo.entities.EstadoSolicitud;
import retotransversal.modelo.formularios.DatoSolicitud;

/** Solicitud tal como la ve el panel de admin. */
public record SolicitudDto(
		Integer idSolicitud,
		String referencia,
		String formulario,
		String asunto,
		String nombre,
		String email,
		List<DatoSolicitud> datos,
		EstadoSolicitud estado,
		LocalDateTime creadaEn,
		LocalDateTime atendidaEn) {
}
