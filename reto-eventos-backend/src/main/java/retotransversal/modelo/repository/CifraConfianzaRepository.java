package retotransversal.modelo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.CifraConfianza;

public interface CifraConfianzaRepository extends JpaRepository<CifraConfianza, Integer> {

	List<CifraConfianza> findAllByOrderByOrdenAsc();
}
