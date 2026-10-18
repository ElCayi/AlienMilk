package retotransversal.modelo.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.EstadoPago;
import retotransversal.modelo.entities.Reserva;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

	List<Reserva> findByUsuarioUsername(String username);

	/** La reserva leída bloqueada: el aviso de pago, la vuelta de quien paga y una cancelación pueden llegar a la vez. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select r from Reserva r where r.idReserva = :idReserva")
	Optional<Reserva> findByIdBloqueando(Integer idReserva);

	Optional<Reserva> findByPagoSesion(String pagoSesion);

	/** Las pendientes de pago cuyo plazo ya pasó: el repaso pregunta a la pasarela en qué quedaron. */
	List<Reserva> findByEstadoPagoAndPagoCaducaEnBeforeAndCanceladaEnIsNull(EstadoPago estadoPago, LocalDateTime antes);

	/** Todas las de una sesión, también las canceladas: su historial. */
	List<Reserva> findByEventoIdEvento(Integer idEvento);

	/** Las vivas de una sesión: las que ocupan plazas. */
	List<Reserva> findByEventoIdEventoAndCanceladaEnIsNull(Integer idEvento);

	/** Las vivas de una persona en una sesión, para el límite de diez plazas. */
	List<Reserva> findByUsuarioUsernameAndEventoIdEventoAndCanceladaEnIsNull(String username, Integer idEvento);

	/** Plazas reservadas y número de reservas vivas de cada sesión que tiene alguna. */
	@Query("select r.evento.idEvento as idEvento, sum(r.cantidad) as plazas, count(r) as reservas "
			+ "from Reserva r where r.canceladaEn is null group by r.evento.idEvento")
	List<OcupacionEvento> ocupacionPorEvento();

	/** Las sesiones que han tenido alguna reserva, también cancelada: esas ya no se borran. */
	@Query("select distinct r.evento.idEvento from Reserva r")
	List<Integer> eventosConReservas();

	/** Plazas reservadas en las sesiones que están en un estado, para el resumen del panel. */
	@Query("select coalesce(sum(r.cantidad), 0) from Reserva r where r.evento.estado = :estado and r.canceladaEn is null")
	long plazasReservadasEn(EstadoEvento estado);

	interface OcupacionEvento {

		Integer getIdEvento();

		Long getPlazas();

		Long getReservas();
	}
}
