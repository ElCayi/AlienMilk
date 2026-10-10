package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.CatalogoTiendaDto;
import retotransversal.modelo.dto.PedidoCrearDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.dto.ProductoDto;
import retotransversal.modelo.service.TiendaService;

/**
 * Tienda (ver SecurityConfig): el catálogo es público y se puede comprar con cuenta o sin ella. El
 * historial es de las cuentas; un pedido de invitado se abre con su referencia y la clave de su
 * enlace, que viaja en una cabecera para que no quede en los registros de acceso.
 */
@RestController
@RequestMapping("/api/tienda")
@RequiredArgsConstructor
public class TiendaRestController {

	static final String CABECERA_CLAVE = "X-Clave-Pedido";

	private final TiendaService tiendaService;

	@GetMapping("/catalogo")
	public CatalogoTiendaDto catalogo() {
		return tiendaService.catalogo();
	}

	@GetMapping("/productos/{slug}")
	public ProductoDto producto(@PathVariable String slug) {
		return tiendaService.producto(slug);
	}

	/** Con sesión, el pedido va a la cuenta; sin ella, es de invitado. */
	@PostMapping("/pedidos")
	public ResponseEntity<PedidoDto> crearPedido(@RequestBody PedidoCrearDto pedido, Authentication authentication,
			HttpServletRequest request) {
		PedidoDto creado = authentication == null
				? tiendaService.crearPedidoInvitado(pedido, OrigenPeticion.de(request))
				: tiendaService.crearPedido(authentication.getName(), pedido);
		return ResponseEntity.status(HttpStatus.CREATED).body(creado);
	}

	@GetMapping("/pedidos")
	public List<PedidoDto> misPedidos(Authentication authentication) {
		return tiendaService.pedidosDe(authentication.getName());
	}

	@PostMapping("/pedidos/{idPedido}/anulacion")
	public PedidoDto anularPedido(@PathVariable Integer idPedido, Authentication authentication) {
		return tiendaService.anularPedido(idPedido, authentication.getName());
	}

	@GetMapping("/consulta/{referencia}")
	public PedidoDto pedidoInvitado(@PathVariable String referencia,
			@RequestHeader(name = CABECERA_CLAVE, required = false) String clave) {
		return tiendaService.pedidoInvitado(referencia, clave);
	}

	@PostMapping("/consulta/{referencia}/anulacion")
	public PedidoDto anularPedidoInvitado(@PathVariable String referencia,
			@RequestHeader(name = CABECERA_CLAVE, required = false) String clave) {
		return tiendaService.anularPedidoInvitado(referencia, clave);
	}
}
