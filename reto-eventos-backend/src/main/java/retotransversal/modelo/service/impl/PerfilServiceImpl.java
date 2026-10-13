package retotransversal.modelo.service.impl;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.repository.PerfilRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.PerfilService;

/**
 * Perfiles de usuario. Los del sistema son los que dan acceso (SecurityConfig solo conoce estos dos),
 * así que no se renombran ni se borran; los demás, solo si nadie los tiene.
 */
@Service
@RequiredArgsConstructor
public class PerfilServiceImpl implements PerfilService {

	private static final Set<String> SISTEMA = Set.of("ROLE_ADMON", "ROLE_CLIENTE");

	private final PerfilRepository perfilRepository;
	private final UsuarioRepository usuarioRepository;

	@Override
	public Perfil findById(Integer id) {
		return perfilRepository.findById(id)
				.orElseThrow(() -> new RecursoNoEncontradoException("Perfil no encontrado"));
	}

	@Override
	public List<Perfil> findAll() {
		return perfilRepository.findAll();
	}

	@Override
	public Perfil insertOne(Perfil entidad) {
		validar(entidad);
		return perfilRepository.save(entidad);
	}

	@Override
	public Perfil updateOne(Perfil entidad) {
		Perfil actual = findById(entidad.getIdPerfil());
		if (esDelSistema(actual)) {
			throw new ConflictoNegocioException("Es un perfil del sistema: no se puede renombrar");
		}
		validar(entidad);
		return perfilRepository.save(entidad);
	}

	@Override
	public int deleteOne(Integer id) {
		Perfil perfil = findById(id);
		if (esDelSistema(perfil)) {
			throw new ConflictoNegocioException("Es un perfil del sistema: no se puede borrar");
		}
		long usuarios = usuariosCon(id);
		if (usuarios > 0) {
			throw new ConflictoNegocioException(usuarios == 1
					? "Una cuenta tiene este perfil: cámbiale el perfil antes de borrarlo"
					: "%d cuentas tienen este perfil: cámbiales el perfil antes de borrarlo".formatted(usuarios));
		}
		perfilRepository.deleteById(id);
		return 1;
	}

	@Override
	public Perfil findByNombre(String nombre) {
		return perfilRepository.findByNombre(nombre)
				.orElseThrow(() -> new RecursoNoEncontradoException("Perfil no encontrado"));
	}

	@Override
	public long usuariosCon(Integer idPerfil) {
		return usuarioRepository.countByPerfilIdPerfil(idPerfil);
	}

	@Override
	public boolean esDelSistema(Perfil perfil) {
		return SISTEMA.contains(perfil.getNombre());
	}

	private void validar(Perfil perfil) {
		perfil.setNombre(ErroresCampos.limpio(perfil.getNombre()));
		new ErroresCampos()
				.obligatorio("nombre", perfil.getNombre(), 45, "Escribe el nombre del perfil")
				.si(perfil.getNombre() != null && perfilRepository.findByNombre(perfil.getNombre())
						.filter(otro -> !otro.getIdPerfil().equals(perfil.getIdPerfil())).isPresent(), "nombre",
						"Ya hay un perfil con ese nombre")
				.lanzarSiHay();
	}
}
