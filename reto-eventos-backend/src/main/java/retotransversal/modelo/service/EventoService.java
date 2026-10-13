package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.dto.EventoAdminDto;
import retotransversal.modelo.entities.Evento;

public interface EventoService extends CrudGenerico<Evento, Integer> {

	List<Evento> findActivos();

	List<Evento> findCancelados();

	List<Evento> findTerminados();

	List<Evento> findActivosPorTipo(Integer idTipo);

	Evento cancelarEvento(Integer idEvento);

	/** Deshace una cancelación: la sesión vuelve a admitir reservas. */
	Evento reactivarEvento(Integer idEvento);

	/** Todas las sesiones con su ocupación, para el panel de administración. */
	List<EventoAdminDto> listadoAdmin();

	EventoAdminDto aAdminDto(Evento evento);
}
