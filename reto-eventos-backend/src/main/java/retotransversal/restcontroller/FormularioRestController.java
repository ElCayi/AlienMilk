package retotransversal.restcontroller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.SolicitudPayloadDto;
import retotransversal.modelo.dto.SolicitudRecibidaDto;
import retotransversal.modelo.formularios.FormularioDefinicion;
import retotransversal.modelo.service.SolicitudService;

/** Formularios públicos: su definición, para pintarlos, y el envío de solicitudes. */
@RestController
@RequestMapping("/api/formularios")
@RequiredArgsConstructor
public class FormularioRestController {

	private final SolicitudService solicitudService;

	@GetMapping("/{clave}")
	public ResponseEntity<FormularioDefinicion> definicion(@PathVariable String clave) {
		return ResponseEntity.ok(solicitudService.definicion(clave));
	}

	@PostMapping("/{clave}/solicitudes")
	public ResponseEntity<SolicitudRecibidaDto> enviar(@PathVariable String clave,
			@RequestBody SolicitudPayloadDto payload, HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(solicitudService.recibir(clave, payload, origen(request)));
	}

	/**
	 * En producción el backend va detrás de Apache, que añade la dirección real del visitante al final
	 * de X-Forwarded-For; lo que venga antes lo pudo escribir el propio visitante.
	 */
	private static String origen(HttpServletRequest request) {
		String reenviado = request.getHeader("X-Forwarded-For");
		if (reenviado != null && !reenviado.isBlank()) {
			String[] saltos = reenviado.split(",");
			return saltos[saltos.length - 1].strip();
		}
		return request.getRemoteAddr();
	}
}
