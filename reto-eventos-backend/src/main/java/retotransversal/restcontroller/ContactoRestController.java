package retotransversal.restcontroller;

import java.security.Principal;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ContactoDto;
import retotransversal.modelo.dto.ContactoPayloadDto;
import retotransversal.modelo.service.ContactoService;

@RestController
@RequiredArgsConstructor
public class ContactoRestController {

	private final ContactoService contactoService;

	@GetMapping("/api/contacto")
	public ResponseEntity<ContactoDto> obtener() {
		return ResponseEntity.ok(ContactoDto.fromEntity(contactoService.obtener()));
	}

	@PutMapping("/api/admin/contacto")
	public ResponseEntity<ContactoDto> actualizar(@RequestBody ContactoPayloadDto dto, Principal principal) {
		return ResponseEntity.ok(ContactoDto.fromEntity(contactoService.actualizar(dto, principal.getName())));
	}
}
