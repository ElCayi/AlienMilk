package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.entities.Reserva;

public interface ReservaService extends CrudGenerico<Reserva, Integer> {

	List<Reserva> findByUsuario(String username);

	/** Todas las reservas, de la sesión más reciente a la más antigua, para el panel de administración. */
	List<Reserva> findTodas();

	Reserva reservarEvento(Integer idEvento, String username, Integer cantidad, String observaciones);

	int cancelarReserva(Integer idReserva, String username);

	int cancelarReservaAdmin(Integer idReserva);
}
