package retotransversal.modelo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import retotransversal.modelo.entities.Evento;

/**
 * Una sesión vista desde el panel de administración: todos sus datos, para editarla sin pedirla otra
 * vez, y su ocupación. Con reservas no se puede borrar (se cancela) ni bajar el aforo por debajo de
 * las plazas ya reservadas.
 */
public record EventoAdminDto(
		Integer idEvento,
		String nombre,
		String descripcion,
		LocalDate fechaInicio,
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
		long reservas) {

	public static EventoAdminDto de(Evento evento, long plazasReservadas, long reservas) {
		return new EventoAdminDto(
				evento.getIdEvento(),
				evento.getNombre(),
				evento.getDescripcion(),
				evento.getFechaInicio(),
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
				reservas);
	}
}
