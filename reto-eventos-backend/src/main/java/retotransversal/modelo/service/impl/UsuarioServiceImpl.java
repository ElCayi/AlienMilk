package retotransversal.modelo.service.impl;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.DatosNoValidosException;
import retotransversal.exception.OperacionNoPermitidaException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.Pedido;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.UsuarioService;

@Service
@RequiredArgsConstructor
public class UsuarioServiceImpl implements UsuarioService {

	private static final Set<EstadoPedido> EN_CURSO = Set.of(EstadoPedido.PENDIENTE_PAGO, EstadoPedido.CONFIRMADO,
			EstadoPedido.ENVIADO);
	private static final SecureRandom AZAR = new SecureRandom();

	private final UsuarioRepository usuarioRepository;
	private final ReservaRepository reservaRepository;
	private final PedidoRepository pedidoRepository;
	private final PasswordEncoder passwordEncoder;

	@Override
	public Usuario findById(String username) {
		return usuarioRepository.findById(username)
				.orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
	}

	@Override
	public List<Usuario> findAll() {
		return usuarioRepository.findAll();
	}

	@Override
	public Usuario insertOne(Usuario entidad) {
		validarDuplicadosAlta(entidad);
		if (entidad.getFechaRegistro() == null) {
			entidad.setFechaRegistro(LocalDate.now());
		}
		if (entidad.getEnabled() == null) {
			entidad.setEnabled(1);
		}
		entidad.setPassword(codificarPasswordSiHaceFalta(entidad.getPassword()));
		return usuarioRepository.save(entidad);
	}

	@Override
	public Usuario updateOne(Usuario entidad) {
		Usuario usuarioExistente = findById(entidad.getUsername());
		validarDuplicadosEdicion(entidad);
		// La fecha de alta es la del registro: no se edita.
		entidad.setFechaRegistro(usuarioExistente.getFechaRegistro());
		// Las comunicaciones solo las cambia la propia persona.
		entidad.setAceptaComunicaciones(usuarioExistente.isAceptaComunicaciones());
		if (entidad.getPassword() == null || entidad.getPassword().isBlank()) {
			entidad.setPassword(usuarioExistente.getPassword());
		} else {
			entidad.setPassword(codificarPasswordSiHaceFalta(entidad.getPassword()));
		}
		return usuarioRepository.save(entidad);
	}

	/**
	 * Las reservas se borran con la cuenta. Los pedidos en curso lo impiden; los cerrados (entregados o
	 * anulados) se quedan como registro de la venta, a nombre de la persona y sin cuenta, como los de
	 * un invitado cuyo enlace nadie tiene.
	 */
	@Override
	@Transactional
	public int deleteOne(String username) {
		Usuario usuario = findById(username);
		List<Pedido> pedidos = pedidoRepository.findAllByUsuarioUsernameOrderByCreadoEnDesc(username);
		if (pedidos.stream().anyMatch(pedido -> EN_CURSO.contains(pedido.getEstado()))) {
			throw new ConflictoNegocioException(
					"Hay pedidos de esta cuenta en curso: se podrá borrar cuando se entreguen o se anulen");
		}
		for (Pedido pedido : pedidos) {
			String nombre = usuario.getApellidos() == null ? usuario.getNombre()
					: usuario.getNombre() + " " + usuario.getApellidos();
			pedido.setNombre(nombre.length() > 80 ? nombre.substring(0, 80) : nombre);
			pedido.setCorreo(usuario.getEmail());
			pedido.setClaveHash(claveSinDueno());
			pedido.setUsuario(null);
		}
		pedidoRepository.saveAll(pedidos);
		reservaRepository.deleteAll(reservaRepository.findByUsuarioUsername(username));
		usuarioRepository.deleteById(username);
		return 1;
	}

	@Override
	@Transactional
	public void eliminarCuentaPropia(String username, String password) {
		Usuario usuario = findById(username);
		if ("ROLE_ADMON".equals(usuario.getPerfil().getNombre())) {
			throw new OperacionNoPermitidaException(
					"Una cuenta de administración solo la puede borrar otra cuenta de administración");
		}
		if (password == null || !passwordEncoder.matches(password, usuario.getPassword())) {
			throw new DatosNoValidosException(Map.of("password", "La contraseña no es correcta"));
		}
		deleteOne(username);
	}

	@Override
	@Transactional
	public Usuario cambiarNombrePropio(String username, String nombre) {
		String limpio = ErroresCampos.limpio(nombre);
		new ErroresCampos().obligatorio("nombre", limpio, 30, "Escribe tu nombre").lanzarSiHay();
		Usuario usuario = findById(username);
		usuario.setNombre(limpio);
		return usuarioRepository.save(usuario);
	}

	@Override
	public List<Usuario> findByPerfilNombre(String nombrePerfil) {
		return usuarioRepository.findByPerfilNombre(nombrePerfil);
	}

	/** Huella de una clave que no se guarda en ningún sitio: el pedido ya no se abre con ningún enlace. */
	private static String claveSinDueno() {
		byte[] clave = new byte[32];
		AZAR.nextBytes(clave);
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(clave));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

	private String codificarPasswordSiHaceFalta(String password) {
		if (password == null || password.isBlank()) {
			throw new IllegalArgumentException("La password es obligatoria");
		}
		if (password.startsWith("{")) {
			return password;
		}
		return passwordEncoder.encode(password);
	}

	private void validarDuplicadosAlta(Usuario entidad) {
		if (usuarioRepository.existsById(entidad.getUsername())) {
			throw new ConflictoNegocioException("El username ya existe");
		}
		if (usuarioRepository.findByEmail(entidad.getEmail()).isPresent()) {
			throw new ConflictoNegocioException("El email ya existe");
		}
	}

	private void validarDuplicadosEdicion(Usuario entidad) {
		usuarioRepository.findByEmail(entidad.getEmail())
				.filter(usuario -> !usuario.getUsername().equals(entidad.getUsername()))
				.ifPresent(usuario -> {
					throw new ConflictoNegocioException("El email ya existe");
				});
	}
}
