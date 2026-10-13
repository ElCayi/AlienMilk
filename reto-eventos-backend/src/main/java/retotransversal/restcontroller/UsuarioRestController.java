package retotransversal.restcontroller;

import java.security.Principal;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.modelo.dto.UsuarioEntradaDto;
import retotransversal.modelo.dto.UsuarioSalidaDto;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.PerfilRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.UsuarioService;

/**
 * Cuentas desde el panel de administración. La contraseña es obligatoria al dar de alta y opcional
 * al editar (vacía, se conserva); la fecha de alta la pone el servidor. Quien administra no puede
 * borrarse, desactivarse ni quitarse el perfil de administrador: se quedaría fuera del panel.
 */
@RestController
@RequestMapping("/api/admin/usuarios")
@RequiredArgsConstructor
public class UsuarioRestController {

	private static final String PERFIL_ADMIN = "ROLE_ADMON";
	private static final Pattern CORREO = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
	private static final Pattern NOMBRE_USUARIO = Pattern.compile("^\\S+$");

	private final UsuarioService usuarioService;
	private final PerfilRepository perfilRepository;
	private final UsuarioRepository usuarioRepository;

	@GetMapping
	public ResponseEntity<List<UsuarioSalidaDto>> findAll(@RequestParam(required = false) String perfil) {
		List<Usuario> usuarios = perfil == null || perfil.isBlank()
				? usuarioService.findAll()
				: usuarioService.findByPerfilNombre(perfil);
		return ResponseEntity.ok(usuarios.stream().map(UsuarioSalidaDto::fromEntity).toList());
	}

	@GetMapping("/{username}")
	public ResponseEntity<UsuarioSalidaDto> findById(@PathVariable String username) {
		return ResponseEntity.ok(UsuarioSalidaDto.fromEntity(usuarioService.findById(username)));
	}

	@PostMapping
	public ResponseEntity<UsuarioSalidaDto> create(@RequestBody UsuarioEntradaDto dto) {
		Perfil perfil = validar(dto, true);
		Usuario usuario = toEntity(dto, perfil);
		usuario.setFechaRegistro(null);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(UsuarioSalidaDto.fromEntity(usuarioService.insertOne(usuario)));
	}

	@PutMapping("/{username}")
	public ResponseEntity<UsuarioSalidaDto> update(@PathVariable String username, @RequestBody UsuarioEntradaDto dto,
			Principal principal) {
		dto.setUsername(username);
		Perfil perfil = validar(dto, false);
		if (username.equals(principal.getName())) {
			if (!Integer.valueOf(1).equals(dto.getEnabled())) {
				throw new ConflictoNegocioException("No puedes desactivar tu propia cuenta");
			}
			if (!PERFIL_ADMIN.equals(perfil.getNombre())) {
				throw new ConflictoNegocioException("No puedes quitarte el perfil de administrador");
			}
		}
		return ResponseEntity.ok(UsuarioSalidaDto.fromEntity(usuarioService.updateOne(toEntity(dto, perfil))));
	}

	@DeleteMapping("/{username}")
	public ResponseEntity<Void> delete(@PathVariable String username, Principal principal) {
		if (username.equals(principal.getName())) {
			throw new ConflictoNegocioException("No puedes borrar tu propia cuenta");
		}
		usuarioService.deleteOne(username);
		return ResponseEntity.noContent().build();
	}

	/** Comprueba el formulario y devuelve el perfil elegido. */
	private Perfil validar(UsuarioEntradaDto dto, boolean alta) {
		dto.setUsername(ErroresCampos.limpio(dto.getUsername()));
		dto.setEmail(ErroresCampos.limpio(dto.getEmail()));
		dto.setNombre(ErroresCampos.limpio(dto.getNombre()));
		dto.setApellidos(ErroresCampos.limpio(dto.getApellidos()));
		dto.setDireccion(ErroresCampos.limpio(dto.getDireccion()));
		Perfil perfil = dto.getIdPerfil() == null ? null : perfilRepository.findById(dto.getIdPerfil()).orElse(null);

		ErroresCampos errores = new ErroresCampos();
		if (alta) {
			errores.obligatorio("username", dto.getUsername(), 45, "Escribe el nombre de usuario")
					.si(dto.getUsername() != null && !NOMBRE_USUARIO.matcher(dto.getUsername()).matches(), "username",
							"Sin espacios")
					.si(dto.getPassword() == null || dto.getPassword().isBlank(), "password",
							"Escribe una contraseña");
		}
		if (alta && dto.getUsername() != null && usuarioRepository.existsById(dto.getUsername())) {
			errores.si(true, "username", "Ya hay una cuenta con ese nombre de usuario");
		}
		errores.obligatorio("email", dto.getEmail(), 100, "Escribe el correo")
				.si(dto.getEmail() != null && !CORREO.matcher(dto.getEmail()).matches(), "email", "Escribe un correo válido")
				.si(dto.getEmail() != null && usuarioRepository.findByEmail(dto.getEmail())
						.filter(otra -> !otra.getUsername().equals(dto.getUsername())).isPresent(), "email",
						"Ya hay otra cuenta con ese correo")
				.obligatorio("nombre", dto.getNombre(), 30, "Escribe el nombre")
				.maximo("apellidos", dto.getApellidos(), 45)
				.maximo("direccion", dto.getDireccion(), 100)
				.si(perfil == null, "idPerfil", "Elige un perfil")
				.lanzarSiHay();

		if (dto.getEnabled() == null) {
			dto.setEnabled(1);
		}
		return perfil;
	}

	private Usuario toEntity(UsuarioEntradaDto dto, Perfil perfil) {
		return Usuario.builder()
				.username(dto.getUsername())
				.password(dto.getPassword())
				.email(dto.getEmail())
				.nombre(dto.getNombre())
				.apellidos(dto.getApellidos())
				.direccion(dto.getDireccion())
				.enabled(dto.getEnabled() == 0 ? 0 : 1)
				.perfil(perfil)
				.build();
	}
}
