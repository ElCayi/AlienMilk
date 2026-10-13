package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ReservaCrearDto;
import retotransversal.modelo.dto.ReservaDto;
import retotransversal.modelo.service.ReservaService;

/** Reservas desde el panel de administración: todas, las de una cuenta, altas manuales y cancelaciones. */
@RestController
@RequestMapping("/api/admin/reservas")
@RequiredArgsConstructor
public class AdminReservaRestController {

	private final ReservaService reservaService;

	@GetMapping
	public ResponseEntity<List<ReservaDto>> todas() {
		return ResponseEntity.ok(reservaService.findTodas().stream().map(ReservaDto::fromEntity).toList());
	}

	@GetMapping("/usuario/{username}")
	public ResponseEntity<List<ReservaDto>> reservasDeUsuario(@PathVariable String username) {
		return ResponseEntity.ok(
				reservaService.findByUsuario(username).stream().map(ReservaDto::fromEntity).toList());
	}

	@PostMapping("/usuario/{username}/evento/{idEvento}")
	public ResponseEntity<ReservaDto> crearReserva(@PathVariable String username,
			@PathVariable Integer idEvento, @RequestBody ReservaCrearDto dto) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ReservaDto.fromEntity(reservaService.reservarEvento(idEvento, username, dto.getCantidad(),
						dto.getObservaciones())));
	}

	@DeleteMapping("/{idReserva}")
	public ResponseEntity<Void> cancelar(@PathVariable Integer idReserva) {
		reservaService.cancelarReservaAdmin(idReserva);
		return ResponseEntity.noContent().build();
	}
}
