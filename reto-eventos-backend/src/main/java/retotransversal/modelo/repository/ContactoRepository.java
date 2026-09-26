package retotransversal.modelo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Contacto;

public interface ContactoRepository extends JpaRepository<Contacto, Integer> {
}
