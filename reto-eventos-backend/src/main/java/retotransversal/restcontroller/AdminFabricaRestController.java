package retotransversal.restcontroller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.service.FabricaService;
import retotransversal.modelo.service.ReservasDemoService;
import retotransversal.modelo.service.SesionesDemoService;

/**
 * Los botones de la demo en el panel: «Restaurar», que la devuelve a su estado de fábrica (ver
 * FabricaService), «Añadir sesiones demo» y «Añadir reservas demo», que suman sesiones y reservas de
 * ejemplo (ver SesionesDemoService y ReservasDemoService).
 */
@RestController
@RequestMapping("/api/admin/fabrica")
@RequiredArgsConstructor
public class AdminFabricaRestController {

	private final FabricaService fabricaService;
	private final SesionesDemoService sesionesDemoService;
	private final ReservasDemoService reservasDemoService;

	@PostMapping
	public ResponseEntity<Void> restaurar() {
		fabricaService.restaurar();
		return ResponseEntity.noContent().build();
	}

	/** Devuelve los nombres de las sesiones añadidas, en el orden del programa. */
	@PostMapping("/sesiones")
	public Map<String, List<String>> anadirSesiones() {
		return Map.of("creadas", sesionesDemoService.anadir().stream().map(Evento::getNombre).toList());
	}

	/** Devuelve cuántas reservas se han añadido (0 si no queda ninguna sesión que las admita). */
	@PostMapping("/reservas")
	public Map<String, Integer> anadirReservas() {
		return Map.of("creadas", reservasDemoService.anadir().size());
	}
}
