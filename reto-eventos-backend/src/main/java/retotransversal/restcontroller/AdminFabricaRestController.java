package retotransversal.restcontroller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.service.FabricaService;

/** El botón «Restaurar» del panel: la demo vuelve a su estado de fábrica (ver FabricaService). */
@RestController
@RequestMapping("/api/admin/fabrica")
@RequiredArgsConstructor
public class AdminFabricaRestController {

	private final FabricaService fabricaService;

	@PostMapping
	public ResponseEntity<Void> restaurar() {
		fabricaService.restaurar();
		return ResponseEntity.noContent().build();
	}
}
