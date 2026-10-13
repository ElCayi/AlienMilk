package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.EventoAdminDto;
import retotransversal.modelo.dto.EventoEntradaDto;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.EventoService;

/**
 * Sesiones desde el panel de administración. El estado no se edita con el formulario: una sesión
 * nace activa y cambia con las acciones de cancelar y reactivar.
 */
@RestController
@RequestMapping("/api/admin/eventos")
@RequiredArgsConstructor
public class AdminEventoRestController {

	private final EventoService eventoService;
	private final TipoEventoRepository tipoEventoRepository;

	@GetMapping
	public ResponseEntity<List<EventoAdminDto>> findAll() {
		return ResponseEntity.ok(eventoService.listadoAdmin());
	}

	@PostMapping
	public ResponseEntity<EventoAdminDto> create(@RequestBody EventoEntradaDto dto) {
		Evento guardado = eventoService.insertOne(toEntity(dto, null));
		return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.aAdminDto(guardado));
	}

	@PutMapping("/{idEvento}")
	public ResponseEntity<EventoAdminDto> update(@PathVariable Integer idEvento, @RequestBody EventoEntradaDto dto) {
		Evento actualizado = eventoService.updateOne(toEntity(dto, idEvento));
		return ResponseEntity.ok(eventoService.aAdminDto(actualizado));
	}

	@PatchMapping("/{idEvento}/cancelar")
	public ResponseEntity<EventoAdminDto> cancelar(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(eventoService.aAdminDto(eventoService.cancelarEvento(idEvento)));
	}

	@PatchMapping("/{idEvento}/reactivar")
	public ResponseEntity<EventoAdminDto> reactivar(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(eventoService.aAdminDto(eventoService.reactivarEvento(idEvento)));
	}

	@DeleteMapping("/{idEvento}")
	public ResponseEntity<Void> delete(@PathVariable Integer idEvento) {
		eventoService.deleteOne(idEvento);
		return ResponseEntity.noContent().build();
	}

	/** Un tipo que no existe llega como vacío: la validación lo señala en su campo. */
	private Evento toEntity(EventoEntradaDto dto, Integer idEvento) {
		return Evento.builder()
				.idEvento(idEvento)
				.nombre(dto.getNombre())
				.descripcion(dto.getDescripcion())
				.fechaInicio(dto.getFechaInicio())
				.duracion(dto.getDuracion())
				.direccion(dto.getDireccion())
				.aforoMaximo(dto.getAforoMaximo())
				.minimoAsistencia(dto.getMinimoAsistencia())
				.precio(dto.getPrecio())
				.tipoEvento(dto.getIdTipo() == null ? null : tipoEventoRepository.findById(dto.getIdTipo()).orElse(null))
				.build();
	}
}
