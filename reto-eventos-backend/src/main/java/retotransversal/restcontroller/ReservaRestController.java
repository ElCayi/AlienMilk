package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

@RestController
@RequestMapping("/api/reservas")
@RequiredArgsConstructor
public class ReservaRestController {

	private final ReservaService reservaService;

	@GetMapping("/mias")
	public ResponseEntity<List<ReservaDto>> misReservas(Authentication authentication) {
		return ResponseEntity.ok(reservaService.findByUsuario(authentication.getName()).stream().map(ReservaDto::fromEntity).toList());
	}

	@PostMapping("/evento/{idEvento}")
	public ResponseEntity<ReservaDto> reservar(@PathVariable Integer idEvento, Authentication authentication,
			@RequestBody ReservaCrearDto dto) {
		return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
				.body(ReservaDto.fromEntity(reservaService.reservarConRegistro(idEvento, authentication.getName(), dto)));
	}

	@DeleteMapping("/{idReserva}")
	public ResponseEntity<Void> cancelar(@PathVariable Integer idReserva, Authentication authentication) {
		reservaService.cancelarReserva(idReserva, authentication.getName());
		return ResponseEntity.noContent().build();
	}
}
