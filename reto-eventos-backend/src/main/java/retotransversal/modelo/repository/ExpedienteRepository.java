package retotransversal.modelo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Expediente;

public interface ExpedienteRepository extends JpaRepository<Expediente, String> {
}
