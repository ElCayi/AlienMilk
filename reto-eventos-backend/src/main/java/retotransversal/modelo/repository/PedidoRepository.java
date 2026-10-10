package retotransversal.modelo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Integer> {

	List<Pedido> findAllByUsuarioUsernameOrderByCreadoEnDesc(String username);

	Optional<Pedido> findByReferencia(String referencia);
}
