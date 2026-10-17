package retotransversal.modelo.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;

public interface EventoRepository extends JpaRepository<Evento, Integer> {

	/**
	 * La sesión con su fila bloqueada hasta el final de la transacción (SELECT … FOR UPDATE): lo que se
	 * cuenta de su aforo no puede cambiar entre la comprobación y el guardado. Dos reservas de la misma
	 * sesión se ponen en fila; las de sesiones distintas no se esperan.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select e from Evento e where e.idEvento = :idEvento")
	Optional<Evento> findByIdBloqueando(@Param("idEvento") Integer idEvento);

	List<Evento> findByEstado(EstadoEvento estado);

	List<Evento> findByTipoEventoIdTipoAndEstado(Integer idTipo, EstadoEvento estado);

	long countByTipoEventoIdTipo(Integer idTipo);

	long countByEstado(EstadoEvento estado);

	/** Las activas de hoy o antes: entre ellas, las que ya acabaron (ver EventoService#terminarCelebradas). */
	List<Evento> findByEstadoAndFechaInicioLessThanEqual(EstadoEvento estado, LocalDate hoy);
}
