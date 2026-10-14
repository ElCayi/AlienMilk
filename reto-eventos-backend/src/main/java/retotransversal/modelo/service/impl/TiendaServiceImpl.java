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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.DatosNoValidosException;
import retotransversal.exception.OperacionNoPermitidaException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.CatalogoTiendaDto;
import retotransversal.modelo.dto.CondicionesTiendaDto;
import retotransversal.modelo.dto.LineaPedidoCrearDto;
import retotransversal.modelo.dto.LineaPedidoDto;
import retotransversal.modelo.dto.PedidoAdminDto;
import retotransversal.modelo.dto.PedidoCrearDto;
import retotransversal.modelo.dto.PedidoDto;
import retotransversal.modelo.dto.ProductoDto;
import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.LineaPedido;
import retotransversal.modelo.entities.Pedido;
import retotransversal.modelo.entities.Producto;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.pagos.AvisoPago;
import retotransversal.modelo.pagos.EstadoSesionPago;
import retotransversal.modelo.pagos.PagoNoDisponibleException;
import retotransversal.modelo.pagos.PasarelaPago;
import retotransversal.modelo.pagos.SesionPago;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ProductoRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.modelo.service.PedidoAvisoEvent;
import retotransversal.modelo.service.PedidoAvisoEvent.Motivo;
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

	private static final Logger log = LoggerFactory.getLogger(TiendaServiceImpl.class);

	private final ProductoRepository productoRepository;
	private final PedidoRepository pedidoRepository;
	private final UsuarioRepository usuarioRepository;
	private final LimitadorSolicitudes limitador;
	/** Sin pasarela (sin clave de Stripe) la tienda es de demostración: confirma sin cobrar. */
	private final PasarelaPago pasarela;
	private final EntityManager entityManager;
	private final Clock reloj;
	/** Avisa de cada cambio que el comprador debe saber (correo, ver AvisoPedidos). */
	private final ApplicationEventPublisher eventos;
	/** La web de la tienda, para los enlaces de los correos. */
	private final String urlTienda;

	@Autowired
	public TiendaServiceImpl(ProductoRepository productoRepository, PedidoRepository pedidoRepository,
			UsuarioRepository usuarioRepository, LimitadorSolicitudes limitador, ObjectProvider<PasarelaPago> pasarela,
			EntityManager entityManager, ApplicationEventPublisher eventos,
			@Value("${tienda.url:http://127.0.0.1:4300}") String urlTienda) {
		this(productoRepository, pedidoRepository, usuarioRepository, limitador, pasarela.getIfAvailable(),
				entityManager, Clock.systemDefaultZone(), eventos, urlTienda);
		log.info(this.pasarela == null
				? "Tienda: pago apagado (sin STRIPE_SECRET_KEY); los pedidos se confirman sin cobrar"
				: "Tienda: pago con Stripe Checkout activo");
	}

	TiendaServiceImpl(ProductoRepository productoRepository, PedidoRepository pedidoRepository,
			UsuarioRepository usuarioRepository, LimitadorSolicitudes limitador, PasarelaPago pasarela,
			EntityManager entityManager, Clock reloj) {
		this(productoRepository, pedidoRepository, usuarioRepository, limitador, pasarela, entityManager, reloj,
				evento -> {
				}, "http://127.0.0.1:4300");
	}

	TiendaServiceImpl(ProductoRepository productoRepository, PedidoRepository pedidoRepository,
			UsuarioRepository usuarioRepository, LimitadorSolicitudes limitador, PasarelaPago pasarela,
			EntityManager entityManager, Clock reloj, ApplicationEventPublisher eventos, String urlTienda) {
		this.productoRepository = productoRepository;
		this.pedidoRepository = pedidoRepository;
		this.usuarioRepository = usuarioRepository;
		this.limitador = limitador;
		this.pasarela = pasarela;
		this.entityManager = entityManager;
		this.reloj = reloj;
		this.eventos = eventos;
		this.urlTienda = urlTienda.replaceAll("/+$", "");
	}

	@Override
	@Transactional(readOnly = true)
	public CatalogoTiendaDto catalogo() {
		return new CatalogoTiendaDto(
				new CondicionesTiendaDto(GASTOS_ENVIO, ENVIO_GRATIS_DESDE, UNIDADES_MAXIMAS, pasarela != null),
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
		Pedido pedido = abrirPago(guardar(datos, cantidades, nuevo -> nuevo.setUsuario(usuario)), usuario.getEmail());
		avisar(Motivo.RECIBIDO, pedido, null);
		return aDto(pedido, null);
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
		abrirPago(pedido, pedido.getCorreo());
		avisar(Motivo.RECIBIDO, pedido, clave);
		return aDto(pedido, clave);
	}

	/** Los pedidos pendientes de pago se ponen al día antes de enseñarlos (ver {@link #alDia}). */
	@Override
	@Transactional
	public List<PedidoDto> pedidosDe(String username) {
		return pedidoRepository.findAllByUsuarioUsernameOrderByCreadoEnDesc(username).stream()
				.map(pedido -> aDto(alDia(pedido), null)).toList();
	}

	@Override
	@Transactional
	public PedidoDto anularPedido(Integer idPedido, String username) {
		Pedido pedido = buscarPedido(idPedido);
		if (pedido.getUsuario() == null || !pedido.getUsuario().getUsername().equals(username)) {
			throw new OperacionNoPermitidaException("Solo puede anular sus propios pedidos");
		}
		return aDto(anular(pedido), null);
	}

	@Override
	@Transactional
	public PedidoDto pedidoInvitado(String referencia, String clave) {
		return aDto(alDia(conClave(referencia, clave)), null);
	}

	@Override
	@Transactional
	public PedidoDto anularPedidoInvitado(String referencia, String clave) {
		return aDto(anular(conClave(referencia, clave)), null);
	}

	@Override
	@Transactional
	public void recibirAvisoPago(String cuerpo, String firma) {
		if (pasarela == null) {
			throw new RecursoNoEncontradoException("La tienda no tiene el pago activado");
		}
		AvisoPago aviso = pasarela.leerAviso(cuerpo, firma);
		log.info("Aviso de pago {} de la sesión {}", aviso.tipo(), aviso.sesion());
		if (aviso.sesion() != null) {
			// Aquí sí se deja salir el error de la pasarela: el aviso falla y Stripe lo vuelve a enviar.
			pedidoRepository.findByPagoSesion(aviso.sesion()).ifPresent(this::sincronizar);
		}
	}

	@Override
	@Transactional(readOnly = true)
	public List<Integer> pagosVencidos() {
		if (pasarela == null) {
			return List.of();
		}
		return pedidoRepository.findAllByEstadoAndPagoCaducaEnBefore(EstadoPedido.PENDIENTE_PAGO,
				LocalDateTime.now(reloj)).stream().map(Pedido::getIdPedido).toList();
	}

	@Override
	@Transactional
	public void repasarPago(Integer idPedido) {
		pedidoRepository.findById(idPedido).ifPresent(this::sincronizar);
	}

	@Override
	@Transactional
	public List<PedidoAdminDto> todosLosPedidos() {
		return pedidoRepository.findAllByOrderByCreadoEnDescIdPedidoDesc().stream().map(pedido -> aAdminDto(alDia(pedido)))
				.toList();
	}

	@Override
	@Transactional
	public PedidoAdminDto avanzarPedido(Integer idPedido, EstadoPedido estado) {
		Pedido pedido = buscarPedido(idPedido);
		bloquear(pedido);
		if (estado == null || estado != siguientePaso(pedido)) {
			throw new ConflictoNegocioException("El pedido " + pedido.getReferencia() + " no puede pasar a "
					+ (estado == null ? "ese estado" : estado.name()));
		}
		LocalDateTime ahora = LocalDateTime.now(reloj);
		if (estado == EstadoPedido.ENVIADO) {
			pedido.setEnviadoEn(ahora);
		} else {
			pedido.setEntregadoEn(ahora);
		}
		pedido.setEstado(estado);
		log.info("Pedido {} {}", pedido.getReferencia(), estado);
		avisar(estado == EstadoPedido.ENVIADO ? Motivo.ENVIADO : Motivo.ENTREGADO, pedido, null);
		return aAdminDto(pedido);
	}

	@Override
	@Transactional
	public PedidoAdminDto anularPedidoAdmin(Integer idPedido) {
		return aAdminDto(anular(buscarPedido(idPedido)));
	}

	private Pedido buscarPedido(Integer idPedido) {
		return pedidoRepository.findById(idPedido)
				.orElseThrow(() -> new RecursoNoEncontradoException("No existe el pedido " + idPedido));
	}

	/**
	 * El paso que le toca a un pedido ya pagado: un envío sale y luego llega; una recogida se entrega
	 * en la sede, sin salir. Vacío si no le queda ninguno.
	 */
	private static EstadoPedido siguientePaso(Pedido pedido) {
		return switch (pedido.getEstado()) {
			case CONFIRMADO -> pedido.getEntrega() == EntregaPedido.ENVIO ? EstadoPedido.ENVIADO : EstadoPedido.ENTREGADO;
			case ENVIADO -> EstadoPedido.ENTREGADO;
			default -> null;
		};
	}

	/** Con pasarela, abre el pago del pedido recién guardado; si no se puede, el pedido entero se deshace. */
	private Pedido abrirPago(Pedido pedido, String correo) {
		if (pasarela != null) {
			SesionPago sesion = pasarela.abrir(pedido, correo);
			pedido.setPagoSesion(sesion.id());
			pedido.setPagoUrl(sesion.url());
			pedido.setPagoCaducaEn(LocalDateTime.ofInstant(sesion.caducaEn(), reloj.getZone()));
		}
		return pedido;
	}

	/**
	 * Pone al día un pedido pendiente de pago preguntando a la pasarela, para quien vuelve de pagar
	 * antes de que llegue el aviso (o cuando no llega). Si la pasarela no contesta, se enseña como estaba.
	 */
	private Pedido alDia(Pedido pedido) {
		if (pedido.getEstado() != EstadoPedido.PENDIENTE_PAGO) {
			return pedido;
		}
		try {
			return sincronizar(pedido);
		} catch (PagoNoDisponibleException e) {
			log.warn("No se ha podido consultar el pago del pedido {}", pedido.getReferencia(), e);
			return pedido;
		}
	}

	/**
	 * Lleva un pedido pendiente al estado de su sesión de pago: pagado, confirmado; caducado, anulado y
	 * con sus unidades de vuelta. Bloquea antes la fila: el aviso, la consulta y una anulación pueden
	 * llegar a la vez, y solo el primero cambia el estado.
	 */
	private Pedido sincronizar(Pedido pedido) {
		bloquear(pedido);
		if (pasarela == null || pedido.getEstado() != EstadoPedido.PENDIENTE_PAGO || pedido.getPagoSesion() == null) {
			return pedido;
		}
		EstadoSesionPago sesion = pasarela.consultar(pedido.getPagoSesion());
		switch (sesion.estado()) {
			case PAGADA -> {
				pedido.setEstado(EstadoPedido.CONFIRMADO);
				pedido.setPagoId(sesion.pago());
				pedido.setPagadoEn(LocalDateTime.now(reloj));
				pedido.setPagoUrl(null);
				log.info("Pedido {} pagado", pedido.getReferencia());
				avisar(Motivo.PAGADO, pedido, null);
			}
			case CADUCADA -> {
				devolverUnidades(pedido);
				log.info("Pedido {} anulado: nadie lo pagó a tiempo", pedido.getReferencia());
				avisar(Motivo.CADUCADO, pedido, null);
			}
			case ABIERTA -> {
				// Aún se puede pagar.
			}
		}
		return pedido;
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
				.estado(pasarela == null ? EstadoPedido.CONFIRMADO : EstadoPedido.PENDIENTE_PAGO)
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

	/**
	 * Anula un pedido que aún no ha salido. Si estaba pendiente, primero se cierra su página de pago
	 * para que nadie pueda pagarlo después; si ya estaba pagado, primero se devuelve el dinero. Si la
	 * pasarela falla, el pedido se queda como estaba.
	 */
	private Pedido anular(Pedido pedido) {
		bloquear(pedido);
		if (pedido.getEstado() == EstadoPedido.PENDIENTE_PAGO && pasarela != null) {
			try {
				pasarela.caducar(pedido.getPagoSesion());
			} catch (PagoNoDisponibleException e) {
				// La sesión ya no estaba abierta. Lo normal es que se haya pagado justo ahora, y entonces se
				// sigue como un pedido pagado; si había caducado, sincronizar ya lo ha anulado.
				sincronizar(pedido);
				if (pedido.getEstado() == EstadoPedido.ANULADO) {
					return pedido;
				}
				if (pedido.getEstado() == EstadoPedido.PENDIENTE_PAGO) {
					throw e;
				}
			}
		}
		if (pedido.getEstado() == EstadoPedido.CONFIRMADO && pedido.getPagoId() != null) {
			if (pasarela == null) {
				throw new ConflictoNegocioException("Ahora mismo no podemos devolver el pago. Inténtelo más tarde.");
			}
			pedido.setReembolsoId(pasarela.reembolsar(pedido.getPagoId()));
		}
		if (pedido.getEstado() != EstadoPedido.CONFIRMADO && pedido.getEstado() != EstadoPedido.PENDIENTE_PAGO) {
			throw new ConflictoNegocioException("Este pedido ya no se puede anular");
		}
		devolverUnidades(pedido);
		avisar(Motivo.ANULADO, pedido, null);
		return pedido;
	}

	private void devolverUnidades(Pedido pedido) {
		pedido.getLineas().forEach(linea -> productoRepository
				.devolverExistencias(linea.getProducto().getIdProducto(), linea.getCantidad()));
		pedido.setEstado(EstadoPedido.ANULADO);
		pedido.setAnuladoEn(LocalDateTime.now(reloj));
		pedido.setPagoUrl(null);
	}

	/**
	 * Publica el cambio para el correo al comprador, que sale al confirmar la transacción. El enlace
	 * privado de un invitado solo se puede dar al crear el pedido (`clave`), porque luego solo queda
	 * su huella; con cuenta, el enlace es Mi panel.
	 */
	private void avisar(Motivo motivo, Pedido pedido, String clave) {
		Usuario usuario = pedido.getUsuario();
		String enlace = usuario != null ? urlTienda + "/cuenta/pedidos"
				: clave != null ? urlTienda + "/tienda/pedido/" + pedido.getReferencia() + "#" + clave : null;
		eventos.publishEvent(new PedidoAvisoEvent(motivo, aDto(pedido, null),
				usuario != null ? usuario.getEmail() : pedido.getCorreo(),
				usuario != null ? usuario.getNombre() : pedido.getNombre(), enlace, pedido.getReembolsoId() != null));
	}

	/** Vuelve a leer el pedido con su fila bloqueada hasta el final de la transacción (SELECT … FOR UPDATE). */
	private void bloquear(Pedido pedido) {
		if (pedido.getIdPedido() != null && entityManager.contains(pedido)) {
			entityManager.refresh(pedido, LockModeType.PESSIMISTIC_WRITE);
		}
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

	/** `clave` solo va en la respuesta que crea un pedido de invitado; la página de pago, mientras está pendiente. */
	private PedidoDto aDto(Pedido pedido, String clave) {
		boolean pendiente = pedido.getEstado() == EstadoPedido.PENDIENTE_PAGO;
		List<LineaPedidoDto> lineas = pedido.getLineas().stream()
				.map(linea -> new LineaPedidoDto(linea.getProducto().getSlug(), linea.getNombre(),
						linea.getPrecioUnitario(), linea.getCantidad(), linea.getImporte()))
				.toList();
		return new PedidoDto(pedido.getIdPedido(), pedido.getReferencia(), pedido.getEstado(), pedido.getEntrega(),
				pedido.getDireccion(), pedido.getSubtotal(), pedido.getGastosEnvio(), pedido.getTotal(),
				pedido.getCreadoEn(), pedido.getAnuladoEn(), pedido.getEnviadoEn(), pedido.getEntregadoEn(), lineas, pedido.getUsuario() == null, pedido.getNombre(),
				pendiente ? pedido.getPagoUrl() : null, pendiente ? pedido.getPagoCaducaEn() : null, clave);
	}

	/** Lo que ve el centro de distribución: el pedido, su comprador, el cobro y lo que se puede hacer con él. */
	private PedidoAdminDto aAdminDto(Pedido pedido) {
		Usuario usuario = pedido.getUsuario();
		boolean anulable = pedido.getEstado() == EstadoPedido.PENDIENTE_PAGO || pedido.getEstado() == EstadoPedido.CONFIRMADO;
		return new PedidoAdminDto(aDto(pedido, null), usuario == null ? null : usuario.getUsername(),
				usuario == null ? pedido.getCorreo() : usuario.getEmail(), pedido.getPagadoEn(),
				pedido.getReembolsoId() != null, siguientePaso(pedido), anulable);
	}
}
