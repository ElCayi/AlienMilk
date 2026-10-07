package retotransversal.modelo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Solicitud;

public interface SolicitudRepository extends JpaRepository<Solicitud, Integer> {

	List<Solicitud> findAllByOrderByCreadaEnDesc();
}
