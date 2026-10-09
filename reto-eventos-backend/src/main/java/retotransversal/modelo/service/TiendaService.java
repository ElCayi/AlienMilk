package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.dto.CatalogoTiendaDto;
import retotransversal.modelo.dto.PedidoCrearDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.dto.ProductoDto;

public interface TiendaService {

	CatalogoTiendaDto catalogo();

	ProductoDto producto(String slug);

	/** Comprueba existencias, calcula importes y guarda el pedido en una sola transacción. */
	PedidoDto crearPedido(String username, PedidoCrearDto datos);

	List<PedidoDto> pedidosDe(String username);

	/** Anula un pedido propio que aún no ha salido y devuelve sus unidades al almacén. */
	PedidoDto anularPedido(Integer idPedido, String username);
}
