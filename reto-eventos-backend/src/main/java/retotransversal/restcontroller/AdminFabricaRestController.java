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
import retotransversal.modelo.service.SesionesDemoService;

/**
 * Los botones de la demo en el panel: «Restaurar», que la devuelve a su estado de fábrica (ver
 * FabricaService), y «Añadir sesiones demo», que suma sesiones de ejemplo (ver SesionesDemoService).
 */
@RestController
@RequestMapping("/api/admin/fabrica")
@RequiredArgsConstructor
public class AdminFabricaRestController {

	private final FabricaService fabricaService;
	private final SesionesDemoService sesionesDemoService;

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
}
