package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.SolicitudDto;
import retotransversal.modelo.dto.SolicitudEstadoDto;
import retotransversal.modelo.service.SolicitudService;

@RestController
@RequestMapping("/api/admin/solicitudes")
@RequiredArgsConstructor
public class AdminSolicitudRestController {

	private final SolicitudService solicitudService;

	@GetMapping
	public ResponseEntity<List<SolicitudDto>> listar() {
		return ResponseEntity.ok(solicitudService.listar());
	}

	@PatchMapping("/{idSolicitud}")
	public ResponseEntity<SolicitudDto> cambiarEstado(@PathVariable Integer idSolicitud,
			@RequestBody SolicitudEstadoDto dto) {
		return ResponseEntity.ok(solicitudService.cambiarEstado(idSolicitud, dto.estado()));
	}

	@DeleteMapping("/{idSolicitud}")
	public ResponseEntity<Void> borrar(@PathVariable Integer idSolicitud) {
		solicitudService.borrar(idSolicitud);
		return ResponseEntity.noContent().build();
	}
}
