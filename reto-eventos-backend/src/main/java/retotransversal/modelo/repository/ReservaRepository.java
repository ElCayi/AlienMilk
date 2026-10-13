package retotransversal.modelo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Reserva;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

	List<Reserva> findByUsuarioUsername(String username);

	List<Reserva> findByEventoIdEvento(Integer idEvento);

	List<Reserva> findByUsuarioUsernameAndEventoIdEvento(String username, Integer idEvento);

	/** Plazas reservadas y número de reservas de cada sesión que tiene alguna. */
	@Query("select r.evento.idEvento as idEvento, sum(r.cantidad) as plazas, count(r) as reservas "
			+ "from Reserva r group by r.evento.idEvento")
	List<OcupacionEvento> ocupacionPorEvento();

	/** Plazas reservadas en las sesiones que están en un estado, para el resumen del panel. */
	@Query("select coalesce(sum(r.cantidad), 0) from Reserva r where r.evento.estado = :estado")
	long plazasReservadasEn(EstadoEvento estado);

	interface OcupacionEvento {

		Integer getIdEvento();

		Long getPlazas();

		Long getReservas();
	}
}
