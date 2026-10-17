package retotransversal.restcontroller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ReservaCrearDto;
import retotransversal.modelo.dto.ReservaDto;
import retotransversal.modelo.dto.ReservaEditarDto;
import retotransversal.modelo.service.ReservaService;

/** Reservas desde el panel de administración: todas, las de una cuenta, altas manuales, ediciones y cancelaciones. */
@RestController
@RequestMapping("/api/admin/reservas")
@RequiredArgsConstructor
public class AdminReservaRestController {

	private final ReservaService reservaService;

	@GetMapping
	public ResponseEntity<List<ReservaDto>> todas() {
		return ResponseEntity.ok(reservaService.findTodas().stream().map(ReservaDto::fromEntity).toList());
	}

	@GetMapping("/usuario/{username}")
	public ResponseEntity<List<ReservaDto>> reservasDeUsuario(@PathVariable String username) {
		return ResponseEntity.ok(
				reservaService.findByUsuario(username).stream().map(ReservaDto::fromEntity).toList());
	}

	@PostMapping("/usuario/{username}/evento/{idEvento}")
	public ResponseEntity<ReservaDto> crearReserva(@PathVariable String username,
			@PathVariable Integer idEvento, @RequestBody ReservaCrearDto dto) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(ReservaDto.fromEntity(reservaService.reservarEvento(idEvento, username, dto.getCantidad(),
						dto.getObservaciones())));
	}

	@PutMapping("/{idReserva}/datos")
	public ResponseEntity<ReservaDto> editar(@PathVariable Integer idReserva, @RequestBody ReservaEditarDto datos) {
		return ResponseEntity.ok(ReservaDto.fromEntity(reservaService.editarReservaAdmin(idReserva, datos)));
	}

	/** Cancelar no borra: la reserva vuelve con su cancelación (ver ReservaService#cancelarReservaAdmin). */
	@PostMapping("/{idReserva}/cancelar")
	public ResponseEntity<ReservaDto> cancelar(@PathVariable Integer idReserva, @RequestBody(required = false) Map<String, Object> datos) {
		Object motivo = datos == null ? null : datos.get("motivo");
		// Lo cobrado se devuelve salvo que se pida lo contrario.
		boolean devolver = datos == null || !Boolean.FALSE.equals(datos.get("devolver"));
		return ResponseEntity.ok(ReservaDto.fromEntity(
				reservaService.cancelarReservaAdmin(idReserva, motivo == null ? null : motivo.toString(), devolver)));
	}

	/** Control de ingreso: un participante registrado entra ({"presente": true}) o se deshace. */
	@PutMapping("/{idReserva}/asistentes/{orden}/entrada")
	public ResponseEntity<ReservaDto> entrada(@PathVariable Integer idReserva, @PathVariable Integer orden,
			@RequestBody Map<String, Object> datos) {
		boolean presente = Boolean.TRUE.equals(datos.get("presente"));
		return ResponseEntity.ok(ReservaDto.fromEntity(reservaService.marcarEntrada(idReserva, orden, presente)));
	}

	/** Control de ingreso de una reserva sin registrar: cuántas de sus plazas han entrado ({"plazas": 2}). */
	@PutMapping("/{idReserva}/entradas")
	public ResponseEntity<ReservaDto> entradas(@PathVariable Integer idReserva, @RequestBody Map<String, Object> datos) {
		Object plazas = datos.get("plazas");
		int valor = plazas instanceof Number numero ? numero.intValue() : -1;
		return ResponseEntity.ok(ReservaDto.fromEntity(reservaService.contarEntradas(idReserva, valor)));
	}

	/** La revisión de las adaptaciones y el material ({"aceptada": true, "nota": "…"}). */
	@PostMapping("/{idReserva}/revision")
	public ResponseEntity<ReservaDto> revision(@PathVariable Integer idReserva, @RequestBody Map<String, Object> datos) {
		Object nota = datos.get("nota");
		return ResponseEntity.ok(ReservaDto.fromEntity(reservaService.revisar(idReserva,
				Boolean.TRUE.equals(datos.get("aceptada")), nota == null ? null : nota.toString())));
	}

	/** Pagada al llegar: la reserva hecha por teléfono, cobrada en taquilla. */
	@PostMapping("/{idReserva}/cobrada")
	public ResponseEntity<ReservaDto> cobrada(@PathVariable Integer idReserva) {
		return ResponseEntity.ok(ReservaDto.fromEntity(reservaService.marcarCobrada(idReserva)));
	}
}
