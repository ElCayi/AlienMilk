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
import retotransversal.modelo.dto.PerfilDto;
import retotransversal.modelo.dto.PerfilPayloadDto;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.service.PerfilService;

@RestController
@RequestMapping("/api/admin/perfiles")
@RequiredArgsConstructor
public class PerfilRestController {

	private final PerfilService perfilService;

	@GetMapping
	public ResponseEntity<List<PerfilDto>> findAll() {
		return ResponseEntity.ok(perfilService.findAll().stream().map(this::aDto).toList());
	}

	@GetMapping("/{idPerfil}")
	public ResponseEntity<PerfilDto> findById(@PathVariable Integer idPerfil) {
		return ResponseEntity.ok(aDto(perfilService.findById(idPerfil)));
	}

	@PostMapping
	public ResponseEntity<PerfilDto> create(@RequestBody PerfilPayloadDto dto) {
		return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
				.body(aDto(perfilService.insertOne(dto.toEntity())));
	}

	@PutMapping("/{idPerfil}")
	public ResponseEntity<PerfilDto> update(@PathVariable Integer idPerfil, @RequestBody PerfilPayloadDto dto) {
		var perfil = dto.toEntity();
		perfil.setIdPerfil(idPerfil);
		return ResponseEntity.ok(aDto(perfilService.updateOne(perfil)));
	}

	@DeleteMapping("/{idPerfil}")
	public ResponseEntity<Void> delete(@PathVariable Integer idPerfil) {
		perfilService.deleteOne(idPerfil);
		return ResponseEntity.noContent().build();
	}

	private PerfilDto aDto(Perfil perfil) {
		return PerfilDto.fromEntity(perfil, perfilService.usuariosCon(perfil.getIdPerfil()), perfilService.esDelSistema(perfil));
	}
}
