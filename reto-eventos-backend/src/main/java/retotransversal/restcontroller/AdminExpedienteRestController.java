package retotransversal.restcontroller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.service.ExpedienteService;

/**
 * El expediente de las sesiones desde el panel: cada capa se guarda entera. Para leerlas, el panel usa
 * la misma lectura que la ficha pública ({@code GET /api/eventos/expedientes}).
 */
@RestController
@RequestMapping("/api/admin/expedientes")
@RequiredArgsConstructor
public class AdminExpedienteRestController {

	private final ExpedienteService expedienteService;

	@PutMapping("/general")
	public ResponseEntity<ExpedienteCapaDto> general(@RequestBody ExpedienteCapaDto capa) {
		return ResponseEntity.ok(expedienteService.guardarGeneral(capa));
	}

	@PutMapping("/tipos/{idTipo}")
	public ResponseEntity<ExpedienteCapaDto> deTipo(@PathVariable Integer idTipo, @RequestBody ExpedienteCapaDto capa) {
		return ResponseEntity.ok(expedienteService.guardarDeTipo(idTipo, capa));
	}

	@PutMapping("/sesiones/{idEvento}")
	public ResponseEntity<ExpedienteCapaDto> deSesion(@PathVariable Integer idEvento,
			@RequestBody ExpedienteCapaDto capa) {
		return ResponseEntity.ok(expedienteService.guardarDeSesion(idEvento, capa));
	}
}
