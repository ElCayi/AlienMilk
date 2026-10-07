package retotransversal.modelo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Premio;

public interface PremioRepository extends JpaRepository<Premio, Integer> {

	List<Premio> findByActivoTrueOrderByOrdenAsc();
}
