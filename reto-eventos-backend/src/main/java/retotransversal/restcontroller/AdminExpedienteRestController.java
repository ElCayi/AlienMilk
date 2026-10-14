package retotransversal.restcontroller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.service.ExpedienteService;

/**
 * Expedientes de las sesiones desde el panel: el de una (en Modificar sesión) y muchos a la vez (el
 * panel de edición en lote), por id de sesión.
 */
@RestController
@RequestMapping("/api/admin/expedientes")
@RequiredArgsConstructor
public class AdminExpedienteRestController {

	private final ExpedienteService expedienteService;

	@GetMapping
	public ResponseEntity<Map<Integer, ExpedienteCapaDto>> todos() {
		return ResponseEntity.ok(expedienteService.todos());
	}

	@PutMapping("/sesiones/{idEvento}")
	public ResponseEntity<ExpedienteCapaDto> deSesion(@PathVariable Integer idEvento,
			@RequestBody ExpedienteCapaDto expediente) {
		return ResponseEntity.ok(expedienteService.guardarDeSesion(idEvento, expediente));
	}

	/** Los expedientes completos de las sesiones que cambian, por id: se guardan todos o ninguno. */
	@PutMapping("/lote")
	public ResponseEntity<Map<Integer, ExpedienteCapaDto>> lote(@RequestBody Map<Integer, ExpedienteCapaDto> expedientes) {
		return ResponseEntity.ok(expedienteService.guardarLote(new LinkedHashMap<>(expedientes)));
	}
}
