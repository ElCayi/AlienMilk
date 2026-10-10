package retotransversal.modelo.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.DatosNoValidosException;
import retotransversal.exception.OperacionNoPermitidaException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.CatalogoTiendaDto;
import retotransversal.modelo.dto.CondicionesTiendaDto;
import retotransversal.modelo.dto.LineaPedidoCrearDto;
import retotransversal.modelo.dto.LineaPedidoDto;
import retotransversal.modelo.dto.PedidoCrearDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.dto.ProductoDto;
import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.LineaPedido;
import retotransversal.modelo.entities.Pedido;
import retotransversal.modelo.entities.Producto;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ProductoRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.modelo.service.TiendaService;

@Service
public class TiendaServiceImpl implements TiendaService {

	static final BigDecimal GASTOS_ENVIO = new BigDecimal("4.90");
	static final BigDecimal ENVIO_GRATIS_DESDE = new BigDecimal("40.00");
	static final int UNIDADES_MAXIMAS = 6;
	static final int LINEAS_MAXIMAS = 20;
	static final int DIRECCION_MAXIMA = 200;
	static final int NOMBRE_MAXIMO = 80;
	static final int CORREO_MAXIMO = 120;

	private static final Pattern CORREO = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
	private static final SecureRandom AZAR = new SecureRandom();

	private static final CondicionesTiendaDto CONDICIONES = new CondicionesTiendaDto(GASTOS_ENVIO,
			ENVIO_GRATIS_DESDE, UNIDADES_MAXIMAS);

	private final ProductoRepository productoRepository;
	private final PedidoRepository pedidoRepository;
	private final UsuarioRepository usuarioRepository;
	private final LimitadorSolicitudes limitador;
	private final Clock reloj;

	@Autowired
	public TiendaServiceImpl(ProductoRepository productoRepository, PedidoRepository pedidoRepository,
			UsuarioRepository usuarioRepository, LimitadorSolicitudes limitador) {
		this(productoRepository, pedidoRepository, usuarioRepository, limitador, Clock.systemDefaultZone());
	}

	TiendaServiceImpl(ProductoRepository productoRepository, PedidoRepository pedidoRepository,
			UsuarioRepository usuarioRepository, LimitadorSolicitudes limitador, Clock reloj) {
		this.productoRepository = productoRepository;
		this.pedidoRepository = pedidoRepository;
		this.usuarioRepository = usuarioRepository;
		this.limitador = limitador;
		this.reloj = reloj;
	}

	@Override
	@Transactional(readOnly = true)
	public CatalogoTiendaDto catalogo() {
		return new CatalogoTiendaDto(CONDICIONES,
				productoRepository.findAllByActivoTrueOrderByOrdenAsc().stream().map(ProductoDto::fromEntity).toList());
	}

	@Override
	@Transactional(readOnly = true)
	public ProductoDto producto(String slug) {
		return productoRepository.findBySlugAndActivoTrue(slug).map(ProductoDto::fromEntity)
				.orElseThrow(() -> new RecursoNoEncontradoException("No existe el producto " + slug));
	}

	@Override
	@Transactional
	public PedidoDto crearPedido(String username, PedidoCrearDto datos) {
		Map<String, Integer> cantidades = validar(datos, false);
		Usuario usuario = usuarioRepository.findById(username)
				.orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
		return aDto(guardar(datos, cantidades, pedido -> pedido.setUsuario(usuario)), null);
	}

	@Override
	@Transactional
	public PedidoDto crearPedidoInvitado(PedidoCrearDto datos, String origen) {
		Map<String, Integer> cantidades = validar(datos, true);
		// Solo cuentan los pedidos bien formados: quien se equivoca en un campo no gasta sus intentos.
		limitador.registrar(origen);
		String clave = nuevaClave();
		Pedido pedido = guardar(datos, cantidades, nuevo -> {
			nuevo.setNombre(datos.nombre().strip());
			nuevo.setCorreo(datos.correo().strip());
			nuevo.setClaveHash(huella(clave));
		});
		return aDto(pedido, clave);
	}

	@Override
	@Transactional(readOnly = true)
	public List<PedidoDto> pedidosDe(String username) {
		return pedidoRepository.findAllByUsuarioUsernameOrderByCreadoEnDesc(username).stream()
				.map(pedido -> aDto(pedido, null)).toList();
	}

	@Override
	@Transactional
	public PedidoDto anularPedido(Integer idPedido, String username) {
		Pedido pedido = pedidoRepository.findById(idPedido)
				.orElseThrow(() -> new RecursoNoEncontradoException("No existe el pedido " + idPedido));
		if (pedido.getUsuario() == null || !pedido.getUsuario().getUsername().equals(username)) {
			throw new OperacionNoPermitidaException("Solo puede anular sus propios pedidos");
		}
		return aDto(anular(pedido), null);
	}

	@Override
	@Transactional(readOnly = true)
	public PedidoDto pedidoInvitado(String referencia, String clave) {
		return aDto(conClave(referencia, clave), null);
	}

	@Override
	@Transactional
	public PedidoDto anularPedidoInvitado(String referencia, String clave) {
		return aDto(anular(conClave(referencia, clave)), null);
	}

	/**
	 * Lo común a los dos compradores: retira existencias, copia precios y guarda. `comprador` pone en
	 * el pedido de quién es.
	 */
	private Pedido guardar(PedidoCrearDto datos, Map<String, Integer> cantidades, Consumer<Pedido> comprador) {
		Map<String, Producto> productos = productoRepository.findAllBySlugIn(cantidades.keySet()).stream()
				.filter(Producto::getActivo)
				.collect(Collectors.toMap(Producto::getSlug, Function.identity()));
		cantidades.keySet().stream().filter(slug -> !productos.containsKey(slug)).findFirst().ifPresent(slug -> {
			throw new ConflictoNegocioException("Uno de los productos de su pedido ya no está a la venta");
		});

		// Las existencias se retiran por orden de producto, para que dos pedidos simultáneos no se
		// esperen el uno al otro. Si falta alguna, la excepción deshace también las ya retiradas.
		productos.values().stream().sorted(Comparator.comparing(Producto::getIdProducto)).forEach(producto -> {
			int cantidad = cantidades.get(producto.getSlug());
			if (productoRepository.retirarExistencias(producto.getIdProducto(), cantidad) == 0) {
				throw new ConflictoNegocioException(faltan(producto));
			}
		});

		Pedido pedido = Pedido.builder()
				.estado(EstadoPedido.CONFIRMADO)
				.entrega(datos.entrega())
				.direccion(datos.entrega() == EntregaPedido.ENVIO ? datos.direccion().strip() : null)
				.creadoEn(LocalDateTime.now(reloj))
				.build();
		comprador.accept(pedido);
		BigDecimal subtotal = BigDecimal.ZERO;
		for (Map.Entry<String, Integer> linea : cantidades.entrySet()) {
			Producto producto = productos.get(linea.getKey());
			BigDecimal importe = producto.getPrecio().multiply(BigDecimal.valueOf(linea.getValue()));
			pedido.agregarLinea(LineaPedido.builder()
					.producto(producto)
					.nombre(producto.getNombre())
					.precioUnitario(producto.getPrecio())
					.cantidad(linea.getValue())
					.importe(dinero(importe))
					.build());
			subtotal = subtotal.add(importe);
		}
		BigDecimal gastos = gastosEnvio(datos.entrega(), subtotal);
		pedido.setSubtotal(dinero(subtotal));
		pedido.setGastosEnvio(gastos);
		pedido.setTotal(dinero(subtotal.add(gastos)));

		Pedido guardado = pedidoRepository.save(pedido);
		guardado.setReferencia("AMD-%d-%04d".formatted(guardado.getCreadoEn().getYear(), guardado.getIdPedido()));
		return guardado;
	}

	private Pedido anular(Pedido pedido) {
		if (pedido.getEstado() != EstadoPedido.CONFIRMADO) {
			throw new ConflictoNegocioException("Este pedido ya no se puede anular");
		}
		pedido.getLineas().forEach(linea -> productoRepository
				.devolverExistencias(linea.getProducto().getIdProducto(), linea.getCantidad()));
		pedido.setEstado(EstadoPedido.ANULADO);
		pedido.setAnuladoEn(LocalDateTime.now(reloj));
		return pedido;
	}

	/**
	 * El pedido de invitado que abre esta clave. Referencia inexistente, pedido de una cuenta o clave
	 * equivocada responden lo mismo, para no confirmar qué referencias existen.
	 */
	private Pedido conClave(String referencia, String clave) {
		RecursoNoEncontradoException noEncontrado = new RecursoNoEncontradoException(
				"No encontramos ese pedido. Compruebe que el enlace está completo.");
		if (referencia == null || clave == null || clave.isBlank()) {
			throw noEncontrado;
		}
		Pedido pedido = pedidoRepository.findByReferencia(referencia.strip()).orElseThrow(() -> noEncontrado);
		// Comparación en tiempo constante: lo que tarda no dice cuántos caracteres acertó.
		if (pedido.getClaveHash() == null || !MessageDigest.isEqual(
				pedido.getClaveHash().getBytes(StandardCharsets.US_ASCII),
				huella(clave.strip()).getBytes(StandardCharsets.US_ASCII))) {
			throw noEncontrado;
		}
		return pedido;
	}

	/** 32 bytes al azar: imposible de adivinar y cabe en un enlace (43 caracteres en Base64 URL). */
	static String nuevaClave() {
		byte[] bytes = new byte[32];
		AZAR.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	static String huella(String clave) {
		try {
			return HexFormat.of().formatHex(
					MessageDigest.getInstance("SHA-256").digest(clave.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("La JVM no tiene SHA-256", e);
		}
	}

	/**
	 * Comprueba la forma del pedido antes de tocar la base de datos y junta las líneas repetidas de
	 * un mismo producto. Devuelve las cantidades por producto en el orden en que llegaron. Sin cuenta
	 * (`invitado`) hacen falta además el nombre y el correo.
	 */
	private Map<String, Integer> validar(PedidoCrearDto datos, boolean invitado) {
		Map<String, String> errores = new LinkedHashMap<>();
		Map<String, Integer> cantidades = new LinkedHashMap<>();
		List<LineaPedidoCrearDto> lineas = datos == null || datos.lineas() == null ? List.of() : datos.lineas();

		if (lineas.isEmpty()) {
			errores.put("lineas", "Su pedido está vacío");
		} else if (lineas.size() > LINEAS_MAXIMAS) {
			errores.put("lineas", "Un pedido admite como máximo %d productos distintos".formatted(LINEAS_MAXIMAS));
		} else {
			for (LineaPedidoCrearDto linea : lineas) {
				if (linea == null || linea.producto() == null || linea.producto().isBlank()) {
					errores.put("lineas", "Falta el producto en una de las líneas");
				} else if (linea.cantidad() == null || linea.cantidad() < 1) {
					errores.put("lineas", "Cada línea debe llevar al menos una unidad");
				} else {
					cantidades.merge(linea.producto().strip(), linea.cantidad(), Integer::sum);
				}
			}
			if (!errores.containsKey("lineas") && cantidades.values().stream().anyMatch(n -> n > UNIDADES_MAXIMAS)) {
				errores.put("lineas", "Como máximo %d unidades de cada producto por pedido".formatted(UNIDADES_MAXIMAS));
			}
		}

		EntregaPedido entrega = datos == null ? null : datos.entrega();
		String direccion = datos == null || datos.direccion() == null ? "" : datos.direccion().strip();
		if (entrega == null) {
			errores.put("entrega", "Elija cómo quiere recibir el pedido");
		} else if (entrega == EntregaPedido.ENVIO && direccion.isEmpty()) {
			errores.put("direccion", "Indique la dirección de entrega");
		} else if (entrega == EntregaPedido.ENVIO && direccion.length() > DIRECCION_MAXIMA) {
			errores.put("direccion", "La dirección no puede superar %d caracteres".formatted(DIRECCION_MAXIMA));
		}

		if (invitado) {
			String nombre = datos == null || datos.nombre() == null ? "" : datos.nombre().strip();
			String correo = datos == null || datos.correo() == null ? "" : datos.correo().strip();
			if (nombre.isEmpty()) {
				errores.put("nombre", "Indique a nombre de quién va el pedido");
			} else if (nombre.length() > NOMBRE_MAXIMO) {
				errores.put("nombre", "El nombre no puede superar %d caracteres".formatted(NOMBRE_MAXIMO));
			}
			if (correo.isEmpty()) {
				errores.put("correo", "Indique un correo para avisarle del pedido");
			} else if (correo.length() > CORREO_MAXIMO || !CORREO.matcher(correo).matches()) {
				errores.put("correo", "Escriba un correo válido");
			}
		}

		if (!errores.isEmpty()) {
			throw new DatosNoValidosException(errores);
		}
		return cantidades;
	}

	/** El envío refrigerado tiene un precio fijo, salvo a partir de cierto importe; la recogida no cuesta nada. */
	static BigDecimal gastosEnvio(EntregaPedido entrega, BigDecimal subtotal) {
		if (entrega == EntregaPedido.RECOGIDA || subtotal.compareTo(ENVIO_GRATIS_DESDE) >= 0) {
			return dinero(BigDecimal.ZERO);
		}
		return GASTOS_ENVIO;
	}

	/** Lo que quedaba al leer el producto; otro pedido puede haberse llevado alguna unidad después. */
	private static String faltan(Producto producto) {
		return switch (producto.getExistencias()) {
			case 0 -> "«%s» está agotado".formatted(producto.getNombre());
			case 1 -> "Solo queda una unidad de «%s»".formatted(producto.getNombre());
			default -> "Solo quedan %d unidades de «%s»".formatted(producto.getExistencias(), producto.getNombre());
		};
	}

	private static BigDecimal dinero(BigDecimal importe) {
		return importe.setScale(2, RoundingMode.HALF_UP);
	}

	/** `clave` solo va en la respuesta que crea un pedido de invitado; en las demás, null. */
	private PedidoDto aDto(Pedido pedido, String clave) {
		List<LineaPedidoDto> lineas = pedido.getLineas().stream()
				.map(linea -> new LineaPedidoDto(linea.getProducto().getSlug(), linea.getNombre(),
						linea.getPrecioUnitario(), linea.getCantidad(), linea.getImporte()))
				.toList();
		return new PedidoDto(pedido.getIdPedido(), pedido.getReferencia(), pedido.getEstado(), pedido.getEntrega(),
				pedido.getDireccion(), pedido.getSubtotal(), pedido.getGastosEnvio(), pedido.getTotal(),
				pedido.getCreadoEn(), pedido.getAnuladoEn(), lineas, pedido.getUsuario() == null, pedido.getNombre(),
				clave);
	}
}
