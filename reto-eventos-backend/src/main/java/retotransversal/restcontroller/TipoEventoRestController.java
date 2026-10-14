package retotransversal.restcontroller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.TipoEventoDto;
import retotransversal.modelo.dto.TipoEventoPayloadDto;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.service.TipoEventoService;

@RestController
@RequestMapping("/api/admin/tipos-evento")
@RequiredArgsConstructor
public class TipoEventoRestController {

	private final TipoEventoService tipoEventoService;

	@GetMapping
	public ResponseEntity<List<TipoEventoDto>> findAll() {
		return ResponseEntity.ok(tipoEventoService.findAll().stream().map(this::aDto).toList());
	}

	@GetMapping("/{idTipo}")
	public ResponseEntity<TipoEventoDto> findById(@PathVariable Integer idTipo) {
		return ResponseEntity.ok(aDto(tipoEventoService.findById(idTipo)));
	}

	@PostMapping
	public ResponseEntity<TipoEventoDto> create(@RequestBody TipoEventoPayloadDto dto) {
		return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
				.body(aDto(tipoEventoService.insertOne(dto.toEntity())));
	}

	@PutMapping("/{idTipo}")
	public ResponseEntity<TipoEventoDto> update(@PathVariable Integer idTipo, @RequestBody TipoEventoPayloadDto dto) {
		var tipoEvento = dto.toEntity();
		tipoEvento.setIdTipo(idTipo);
		return ResponseEntity.ok(aDto(tipoEventoService.updateOne(tipoEvento)));
	}

	@DeleteMapping("/{idTipo}")
	public ResponseEntity<Void> delete(@PathVariable Integer idTipo) {
		tipoEventoService.deleteOne(idTipo);
		return ResponseEntity.noContent().build();
	}

	private TipoEventoDto aDto(TipoEvento tipo) {
		return TipoEventoDto.fromEntity(tipo, tipoEventoService.sesionesDe(tipo.getIdTipo()));
	}
}
