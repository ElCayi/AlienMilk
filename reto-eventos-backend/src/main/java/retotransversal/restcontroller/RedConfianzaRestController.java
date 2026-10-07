package retotransversal.restcontroller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.RedConfianzaDto;
import retotransversal.modelo.service.RedConfianzaService;

@RestController
@RequiredArgsConstructor
public class RedConfianzaRestController {

	private final RedConfianzaService redConfianzaService;

	/** Pública: la pinta la portada. */
	@GetMapping("/api/red-de-confianza")
	public ResponseEntity<RedConfianzaDto> obtener() {
		return ResponseEntity.ok(redConfianzaService.obtener());
	}
}
