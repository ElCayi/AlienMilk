package retotransversal.modelo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Socio;

public interface SocioRepository extends JpaRepository<Socio, Integer> {

	List<Socio> findByActivoTrueOrderByOrdenAsc();
}
