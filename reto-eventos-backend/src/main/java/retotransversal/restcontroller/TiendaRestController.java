package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.CatalogoTiendaDto;
import retotransversal.modelo.dto.PedidoCrearDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.dto.ProductoDto;
import retotransversal.modelo.service.TiendaService;

/** Tienda: el catálogo es público; los pedidos, de quien ha iniciado sesión (ver SecurityConfig). */
@RestController
@RequestMapping("/api/tienda")
@RequiredArgsConstructor
public class TiendaRestController {

	private final TiendaService tiendaService;

	@GetMapping("/catalogo")
	public CatalogoTiendaDto catalogo() {
		return tiendaService.catalogo();
	}

	@GetMapping("/productos/{slug}")
	public ProductoDto producto(@PathVariable String slug) {
		return tiendaService.producto(slug);
	}

	@PostMapping("/pedidos")
	public ResponseEntity<PedidoDto> crearPedido(@RequestBody PedidoCrearDto pedido, Authentication authentication) {
		return ResponseEntity.status(HttpStatus.CREATED).body(tiendaService.crearPedido(authentication.getName(), pedido));
	}

	@GetMapping("/pedidos")
	public List<PedidoDto> misPedidos(Authentication authentication) {
		return tiendaService.pedidosDe(authentication.getName());
	}

	@PostMapping("/pedidos/{idPedido}/anulacion")
	public PedidoDto anularPedido(@PathVariable Integer idPedido, Authentication authentication) {
		return tiendaService.anularPedido(idPedido, authentication.getName());
	}
}
