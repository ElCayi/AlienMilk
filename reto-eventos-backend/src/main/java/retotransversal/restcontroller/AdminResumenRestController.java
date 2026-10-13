package retotransversal.restcontroller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.ResumenAdminDto;
import retotransversal.modelo.service.ResumenAdminService;

@RestController
@RequiredArgsConstructor
public class AdminResumenRestController {

	private final ResumenAdminService resumenAdminService;

	@GetMapping("/api/admin/resumen")
	public ResponseEntity<ResumenAdminDto> resumen() {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(resumenAdminService.resumen());
	}
}
