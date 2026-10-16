package retotransversal.modelo.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;

public interface EventoRepository extends JpaRepository<Evento, Integer> {

	List<Evento> findByEstado(EstadoEvento estado);

	List<Evento> findByTipoEventoIdTipoAndEstado(Integer idTipo, EstadoEvento estado);

	long countByTipoEventoIdTipo(Integer idTipo);

	long countByEstado(EstadoEvento estado);

	/** Las activas de hoy o antes: entre ellas, las que ya acabaron (ver EventoService#terminarCelebradas). */
	List<Evento> findByEstadoAndFechaInicioLessThanEqual(EstadoEvento estado, LocalDate hoy);
}
