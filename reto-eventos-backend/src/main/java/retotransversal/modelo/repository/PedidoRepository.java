package retotransversal.modelo.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Integer> {

	List<Pedido> findAllByUsuarioUsernameOrderByCreadoEnDesc(String username);

	Optional<Pedido> findByReferencia(String referencia);

	Optional<Pedido> findByPagoSesion(String pagoSesion);

	/** Pedidos cuyo plazo de pago ya ha pasado, para repasarlos si no llegó el aviso. */
	List<Pedido> findAllByEstadoAndPagoCaducaEnBefore(EstadoPedido estado, LocalDateTime limite);
}
