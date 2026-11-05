package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import retotransversal.modelo.entities.Evento;

/**
 * Una sesión vista desde el panel de administración: todos sus datos, para editarla sin pedirla otra
 * vez, y su ocupación. Solo se borra si nunca ha tenido reservas (`borrable`); con historia, se cancela
 * y se archiva. El aforo no baja de las plazas ya reservadas.
 */
public record EventoAdminDto(
		Integer idEvento,
		String nombre,
		String descripcion,
		LocalDate fechaInicio,
		@JsonFormat(pattern = "HH:mm") LocalTime horaInicio,
		Integer duracion,
		String direccion,
		String estado,
		Integer aforoMaximo,
		Integer minimoAsistencia,
		BigDecimal precio,
		Integer idTipo,
		String tipoEvento,
		String imagen,
		boolean archivada,
		long plazasReservadas,
		long reservas,
		boolean borrable) {

	public static EventoAdminDto de(Evento evento, long plazasReservadas, long reservas, boolean borrable) {
		return new EventoAdminDto(
				evento.getIdEvento(),
				evento.getNombre(),
				evento.getDescripcion(),
				evento.getFechaInicio(),
				evento.getHoraInicio(),
				evento.getDuracion(),
				evento.getDireccion(),
				evento.getEstado().name(),
				evento.getAforoMaximo(),
				evento.getMinimoAsistencia(),
				evento.getPrecio(),
				evento.getTipoEvento().getIdTipo(),
				evento.getTipoEvento().getNombre(),
				evento.getImagen(),
				evento.isArchivada(),
				plazasReservadas,
				reservas,
				borrable);
	}
}
