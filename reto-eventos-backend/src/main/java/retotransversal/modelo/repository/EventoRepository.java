package retotransversal.modelo.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;

public interface EventoRepository extends JpaRepository<Evento, Integer> {

	List<Evento> findByEstado(EstadoEvento estado);

	List<Evento> findByTipoEventoIdTipoAndEstado(Integer idTipo, EstadoEvento estado);

	long countByTipoEventoIdTipo(Integer idTipo);

	long countByEstado(EstadoEvento estado);

	/** Da por terminadas las sesiones activas anteriores a {@code hoy}; devuelve cuántas eran. */
	@Modifying
	@Query("update Evento e set e.estado = retotransversal.modelo.entities.EstadoEvento.TERMINADO"
			+ " where e.estado = retotransversal.modelo.entities.EstadoEvento.ACTIVO and e.fechaInicio < :hoy")
	int terminarAnterioresA(@Param("hoy") LocalDate hoy);
}
