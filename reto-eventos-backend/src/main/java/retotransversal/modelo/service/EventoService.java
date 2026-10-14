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

	/**
	 * Borra la sesión y, con ella, sus reservas: desaparecen también del panel de sus clientes. El
	 * borrado normal ({@code deleteOne}) se niega si hay reservas; este es el que se confirma aparte.
	 */
	int borrarConReservas(Integer idEvento);

	/** Archiva una sesión que ya no está activa, o la saca del archivo. */
	Evento archivar(Integer idEvento, boolean archivada);

	/** Deshace una cancelación: la sesión vuelve a admitir reservas. */
	Evento reactivarEvento(Integer idEvento);

	/** Da por terminadas las sesiones activas cuya fecha ya pasó; devuelve cuántas. */
	int terminarCelebradas();

	/** Todas las sesiones con su ocupación, para el panel de administración. */
	List<EventoAdminDto> listadoAdmin();

	EventoAdminDto aAdminDto(Evento evento);
}
