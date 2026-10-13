package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.PedidoAdminDto;
import retotransversal.modelo.dto.PedidoEstadoDto;
import retotransversal.modelo.service.TiendaService;

/** Centro de distribución: los pedidos de la tienda, su salida, su entrega y su anulación. */
@RestController
@RequestMapping("/api/admin/pedidos")
@RequiredArgsConstructor
public class AdminPedidoRestController {

	private final TiendaService tiendaService;

	@GetMapping
	public ResponseEntity<List<PedidoAdminDto>> listar() {
		return ResponseEntity.ok(tiendaService.todosLosPedidos());
	}

	@PatchMapping("/{idPedido}")
	public ResponseEntity<PedidoAdminDto> avanzar(@PathVariable Integer idPedido, @RequestBody PedidoEstadoDto dto) {
		return ResponseEntity.ok(tiendaService.avanzarPedido(idPedido, dto.estado()));
	}

	@PostMapping("/{idPedido}/anulacion")
	public ResponseEntity<PedidoAdminDto> anular(@PathVariable Integer idPedido) {
		return ResponseEntity.ok(tiendaService.anularPedidoAdmin(idPedido));
	}
}
