package retotransversal.modelo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, String> {

	Optional<Usuario> findByEmail(String email);

	List<Usuario> findByPerfilNombre(String nombrePerfil);

	long countByPerfilIdPerfil(Integer idPerfil);
}
