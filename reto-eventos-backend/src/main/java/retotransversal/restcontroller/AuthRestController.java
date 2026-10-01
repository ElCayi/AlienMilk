package retotransversal.restcontroller;

import java.util.List;
import retotransversal.modelo.service.DemoAccountService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.AuthUsuarioDto;
import retotransversal.modelo.dto.RegistroUsuarioDto;
import retotransversal.modelo.dto.UsuarioSalidaDto;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.service.PerfilService;
import retotransversal.modelo.service.UsuarioService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthRestController {

	private final UsuarioService usuarioService;
	private final PerfilService perfilService;
	private final DemoAccountService demoAccountService;

	@GetMapping("/demo-accounts")
	public ResponseEntity<List<DemoAccountService.DemoAccount>> demoAccounts() {
		return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
				.body(demoAccountService.availableAccounts());
	}

	@PostMapping("/register")
	public ResponseEntity<UsuarioSalidaDto> register(@RequestBody RegistroUsuarioDto dto) {
		Usuario usuario = Usuario.builder()
				.username(dto.getUsername())
				.password(dto.getPassword())
				.email(dto.getEmail())
				// The sign-up form only asks for user, email and password; the name
				// column is required, so it starts as the username.
				.nombre(StringUtils.hasText(dto.getNombre()) ? dto.getNombre() : nombreInicial(dto.getUsername()))
				.apellidos(dto.getApellidos())
				.direccion(dto.getDireccion())
				.enabled(1)
				.perfil(perfilService.findByNombre("ROLE_CLIENTE"))
				.build();

		return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
				.body(UsuarioSalidaDto.fromEntity(usuarioService.insertOne(usuario)));
	}

	// "nombre" holds at most 30 characters; a username may be longer.
	private static String nombreInicial(String username) {
		return username == null ? null : username.substring(0, Math.min(30, username.length()));
	}

	@GetMapping("/me")
	public ResponseEntity<AuthUsuarioDto> me(Authentication authentication) {
		Usuario usuario = usuarioService.findById(authentication.getName());

		return ResponseEntity.ok(AuthUsuarioDto.builder()
				.username(usuario.getUsername())
				.nombre(usuario.getNombre())
				.perfil(usuario.getPerfil().getNombre())
				.authorities(authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
				.build());
	}
}
