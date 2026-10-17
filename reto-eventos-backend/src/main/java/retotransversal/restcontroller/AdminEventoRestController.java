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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.EventoAdminDto;
import retotransversal.modelo.dto.EventoEntradaDto;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.ExpedienteService;
import retotransversal.modelo.service.ImagenSesionService;
import retotransversal.modelo.service.PagosReservasService;

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
	private final ExpedienteService expedienteService;
	private final ImagenSesionService imagenSesionService;
	/** Cancelar o reactivar una sesión mueve también el dinero de sus reservas. */
	private final PagosReservasService pagosReservas;

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
		return ResponseEntity.ok(eventoService.aAdminDto(pagosReservas.cancelarSesion(idEvento)));
	}

	@PatchMapping("/{idEvento}/archivar")
	public ResponseEntity<EventoAdminDto> archivar(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(eventoService.aAdminDto(eventoService.archivar(idEvento, true)));
	}

	@PatchMapping("/{idEvento}/desarchivar")
	public ResponseEntity<EventoAdminDto> desarchivar(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(eventoService.aAdminDto(eventoService.archivar(idEvento, false)));
	}

	@PatchMapping("/{idEvento}/reactivar")
	public ResponseEntity<EventoAdminDto> reactivar(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(eventoService.aAdminDto(pagosReservas.reactivarSesion(idEvento)));
	}

	/** Sube la foto propia de la sesión (JPG, PNG o WebP, hasta 5 MB) y sustituye la anterior. */
	@PostMapping("/{idEvento}/imagen")
	public ResponseEntity<EventoAdminDto> subirImagen(@PathVariable Integer idEvento,
			@RequestParam("archivo") MultipartFile archivo) {
		return ResponseEntity.ok(eventoService.aAdminDto(imagenSesionService.guardar(idEvento, archivo)));
	}

	/** Quita la foto propia: la sesión vuelve a la de la web. */
	@DeleteMapping("/{idEvento}/imagen")
	public ResponseEntity<EventoAdminDto> quitarImagen(@PathVariable Integer idEvento) {
		return ResponseEntity.ok(eventoService.aAdminDto(imagenSesionService.quitar(idEvento)));
	}

	/**
	 * Con la sesión se van su expediente propio y su foto. Si tiene reservas, hace falta
	 * {@code ?conReservas=true}: se borran con ella (sin eso, 409 y la propuesta de cancelarla).
	 */
	@DeleteMapping("/{idEvento}")
	public ResponseEntity<Void> delete(@PathVariable Integer idEvento,
			@RequestParam(defaultValue = "false") boolean conReservas) {
		String imagen = eventoService.findById(idEvento).getImagen();
		if (conReservas) {
			eventoService.borrarConReservas(idEvento);
		} else {
			eventoService.deleteOne(idEvento);
		}
		expedienteService.borrarDeSesion(idEvento);
		imagenSesionService.borrarArchivo(imagen);
		return ResponseEntity.noContent().build();
	}

	/** Un tipo que no existe llega como vacío: la validación lo señala en su campo. */
	private Evento toEntity(EventoEntradaDto dto, Integer idEvento) {
		return Evento.builder()
				.idEvento(idEvento)
				.nombre(dto.getNombre())
				.descripcion(dto.getDescripcion())
				.fechaInicio(dto.getFechaInicio())
				.horaInicio(dto.getHoraInicio())
				.duracion(dto.getDuracion())
				.direccion(dto.getDireccion())
				.aforoMaximo(dto.getAforoMaximo())
				.minimoAsistencia(dto.getMinimoAsistencia())
				.precio(dto.getPrecio())
				.tipoEvento(dto.getIdTipo() == null ? null : tipoEventoRepository.findById(dto.getIdTipo()).orElse(null))
				.build();
	}
}
