package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.EventoDetalleDto;
import retotransversal.modelo.dto.EventoListadoDto;
import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.ExpedienteService;
import retotransversal.modelo.service.ImagenSesionService;
import retotransversal.modelo.service.ImagenSesionService.Foto;

@RestController
@RequestMapping("/api/eventos")
@RequiredArgsConstructor
public class EventoRestController {

	private final EventoService eventoService;
	private final ExpedienteService expedienteService;
	private final ImagenSesionService imagenSesionService;

	/** El expediente de la sesión: lo que enseña su ficha pública además de sus datos. */
	@GetMapping("/{idEvento}/expediente")
	public ResponseEntity<ExpedienteCapaDto> expediente(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(expedienteService.deSesion(idEvento));
	}

	/**
	 * La foto propia de una sesión. Cada foto nueva tiene otro nombre y la web la pide con él
	 * ({@code ?v=<nombre>}), así que se puede guardar en caché sin miedo.
	 */
	@GetMapping("/{idEvento}/imagen")
	public ResponseEntity<org.springframework.core.io.Resource> imagen(@PathVariable Integer idEvento) {
		Foto foto = imagenSesionService.leer(idEvento);
		return ResponseEntity.ok()
				.contentType(foto.tipo())
				.cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(30)).cachePublic())
				.body(foto.archivo());
	}

	@GetMapping("/activos")
	public ResponseEntity<List<EventoListadoDto>> activos() {
		return ResponseEntity.ok(eventoService.findActivos().stream().map(EventoListadoDto::fromEntity).toList());
	}

	@GetMapping("/cancelados")
	public ResponseEntity<List<EventoListadoDto>> cancelados() {
		return ResponseEntity.ok(eventoService.findCancelados().stream().map(EventoListadoDto::fromEntity).toList());
	}

	@GetMapping("/terminados")
	public ResponseEntity<List<EventoListadoDto>> terminados() {
		return ResponseEntity.ok(eventoService.findTerminados().stream().map(EventoListadoDto::fromEntity).toList());
	}

	@GetMapping("/tipo/{idTipo}")
	public ResponseEntity<List<EventoListadoDto>> porTipo(@PathVariable Integer idTipo) {
		return ResponseEntity.ok(eventoService.findActivosPorTipo(idTipo).stream().map(EventoListadoDto::fromEntity).toList());
	}

	@GetMapping("/{idEvento}")
	public ResponseEntity<EventoDetalleDto> detalle(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(EventoDetalleDto.fromEntity(eventoService.findById(idEvento)));
	}
}
