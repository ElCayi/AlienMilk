package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import jakarta.persistence.EntityManager;
import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.CategoriaProducto;
import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.LineaPedido;
import retotransversal.modelo.entities.Pedido;
import retotransversal.modelo.entities.Producto;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.pagos.AvisoPago;
import retotransversal.modelo.pagos.AvisoPagoNoValidoException;
import retotransversal.modelo.pagos.EstadoSesionPago;
import retotransversal.modelo.pagos.PagoNoDisponibleException;
import retotransversal.modelo.pagos.PasarelaPago;
import retotransversal.modelo.pagos.SesionPago;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ProductoRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.restcontroller.TiendaRestController;

/** El cobro por HTTP, con el servicio real y la pasarela simulada (la de verdad es StripePasarela). */
class TiendaPagosTest {

	private final ProductoRepository productos = mock(ProductoRepository.class);
	private final PedidoRepository pedidos = mock(PedidoRepository.class);
	private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
	private final PasarelaPago pasarela = mock(PasarelaPago.class);

	private final Producto copa = Producto.builder().idProducto(7).slug("copa-de-degustacion")
			.nombre("Copa de degustación").categoria(CategoriaProducto.MESA).precio(new BigDecimal("18.00"))
			.existencias(90).build();
	private final Usuario ripley = Usuario.builder().username("ripley").email("ripley@nostromo.space").build();
	private final Instant ahora = Instant.parse("2026-10-12T10:00:00Z");

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		when(usuarios.findById("ripley")).thenReturn(Optional.of(ripley));
		when(productos.findAllBySlugIn(any())).thenAnswer(call -> {
			Collection<String> slugs = call.getArgument(0);
			return slugs.contains(copa.getSlug()) ? List.of(copa) : List.of();
		});
		when(productos.retirarExistencias(anyInt(), anyInt())).thenReturn(1);
		when(pedidos.save(any())).thenAnswer(call -> {
			Pedido pedido = call.getArgument(0);
			pedido.setIdPedido(42);
			return pedido;
		});
		when(pasarela.abrir(any(), any())).thenReturn(new SesionPago("cs_test_42",
				"https://checkout.stripe.com/c/pay/cs_test_42", ahora.plusSeconds(1800)));
		Clock reloj = Clock.fixed(ahora, ZoneId.of("Europe/Madrid"));
		TiendaServiceImpl servicio = new TiendaServiceImpl(productos, pedidos, usuarios,
				mock(LimitadorSolicitudes.class), pasarela, mock(EntityManager.class), reloj);
		mvc = MockMvcBuilders.standaloneSetup(new TiendaRestController(servicio))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void anOrderWaitsForPaymentWithItsUnitsReservedAndPointsToStripe() throws Exception {
		pedir()
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.estado").value("PENDIENTE_PAGO"))
				.andExpect(jsonPath("$.pagoUrl").value("https://checkout.stripe.com/c/pay/cs_test_42"))
				.andExpect(jsonPath("$.pagoCaducaEn").isNotEmpty());

		verify(productos).retirarExistencias(7, 2);
		verify(pasarela).abrir(any(), eq("ripley@nostromo.space"));
		mvc.perform(get("/api/tienda/catalogo")).andExpect(jsonPath("$.condiciones.pagoConTarjeta").value(true));
	}

	@Test
	void ifStripeCannotOpenThePaymentTheOrderFails() throws Exception {
		when(pasarela.abrir(any(), any())).thenThrow(new PagoNoDisponibleException(
				"No hemos podido abrir el pago. Inténtelo de nuevo en unos minutos.", null));

		// La excepción deshace la transacción entera, también las unidades ya retiradas.
		pedir()
				.andExpect(status().isBadGateway())
				.andExpect(jsonPath("$.message").value("No hemos podido abrir el pago. Inténtelo de nuevo en unos minutos."));
	}

	@Test
	void aPaidNoticeConfirmsTheOrderOnlyOnce() throws Exception {
		Pedido pedido = pendiente();
		when(pasarela.leerAviso("{}", "t=1,v1=firma")).thenReturn(new AvisoPago("checkout.session.completed", "cs_test_42"));
		when(pedidos.findByPagoSesion("cs_test_42")).thenReturn(Optional.of(pedido));
		when(pasarela.consultar("cs_test_42")).thenReturn(new EstadoSesionPago(EstadoSesionPago.Estado.PAGADA, "pi_42"));

		avisar().andExpect(status().isOk());
		avisar().andExpect(status().isOk());

		assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.CONFIRMADO);
		assertThat(pedido.getPagoId()).isEqualTo("pi_42");
		assertThat(pedido.getPagadoEn()).isNotNull();
		// El segundo aviso (Stripe repite los avisos) ya encuentra el pedido confirmado.
		verify(pasarela, times(1)).consultar("cs_test_42");
	}

	@Test
	void anExpiredPaymentReturnsTheUnits() throws Exception {
		Pedido pedido = pendiente();
		when(pasarela.leerAviso(anyString(), anyString())).thenReturn(new AvisoPago("checkout.session.expired", "cs_test_42"));
		when(pedidos.findByPagoSesion("cs_test_42")).thenReturn(Optional.of(pedido));
		when(pasarela.consultar("cs_test_42")).thenReturn(new EstadoSesionPago(EstadoSesionPago.Estado.CADUCADA, null));

		avisar().andExpect(status().isOk());

		assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.ANULADO);
		verify(productos).devolverExistencias(7, 2);
	}

	@Test
	void aNoticeWithABadSignatureIsRejected() throws Exception {
		when(pasarela.leerAviso(anyString(), anyString())).thenThrow(new AvisoPagoNoValidoException("Firma no válida", null));

		avisar().andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Aviso no válido"));
		verify(pedidos, never()).findByPagoSesion(any());
	}

	@Test
	void cancellingAPendingOrderClosesItsPaymentPageFirst() throws Exception {
		Pedido pedido = pendiente();
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));

		mvc.perform(post("/api/tienda/pedidos/42/anulacion").principal(como("ripley")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("ANULADO"))
				.andExpect(jsonPath("$.pagoUrl").doesNotExist());

		verify(pasarela).caducar("cs_test_42");
		verify(pasarela, never()).reembolsar(any());
		verify(productos).devolverExistencias(7, 2);
	}

	@Test
	void ifItWasPaidMeanwhileCancellingRefundsIt() throws Exception {
		Pedido pedido = pendiente();
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));
		doThrow(new PagoNoDisponibleException("No hemos podido cerrar el pago.", null)).when(pasarela).caducar("cs_test_42");
		when(pasarela.consultar("cs_test_42")).thenReturn(new EstadoSesionPago(EstadoSesionPago.Estado.PAGADA, "pi_42"));
		when(pasarela.reembolsar("pi_42")).thenReturn("re_42");

		mvc.perform(post("/api/tienda/pedidos/42/anulacion").principal(como("ripley")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("ANULADO"));

		assertThat(pedido.getReembolsoId()).isEqualTo("re_42");
		verify(productos).devolverExistencias(7, 2);
	}

	@Test
	void ifTheRefundFailsThePaidOrderStaysAsItWas() throws Exception {
		Pedido pedido = pendiente();
		pedido.setEstado(EstadoPedido.CONFIRMADO);
		pedido.setPagoId("pi_42");
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));
		when(pasarela.reembolsar("pi_42")).thenThrow(new PagoNoDisponibleException("No hemos podido devolver el pago.", null));

		mvc.perform(post("/api/tienda/pedidos/42/anulacion").principal(como("ripley")))
				.andExpect(status().isBadGateway());

		assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.CONFIRMADO);
		verify(productos, never()).devolverExistencias(anyInt(), anyInt());
	}

	@Test
	void theHistoryAsksStripeAboutPendingOrdersBeforeShowingThem() throws Exception {
		Pedido pedido = pendiente();
		when(pedidos.findAllByUsuarioUsernameOrderByCreadoEnDesc("ripley")).thenReturn(List.of(pedido));
		when(pasarela.consultar("cs_test_42")).thenReturn(new EstadoSesionPago(EstadoSesionPago.Estado.PAGADA, "pi_42"));

		mvc.perform(get("/api/tienda/pedidos").principal(como("ripley")))
				.andExpect(jsonPath("$[0].estado").value("CONFIRMADO"))
				.andExpect(jsonPath("$[0].pagoUrl").doesNotExist());

		// Si Stripe no contesta, se enseña como estaba en lugar de fallar.
		Pedido otro = pendiente();
		when(pedidos.findAllByUsuarioUsernameOrderByCreadoEnDesc("ripley")).thenReturn(List.of(otro));
		when(pasarela.consultar("cs_test_42")).thenThrow(new PagoNoDisponibleException("No hemos podido consultar el pago.", null));
		mvc.perform(get("/api/tienda/pedidos").principal(como("ripley")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].estado").value("PENDIENTE_PAGO"));
	}

	private ResultActions pedir() throws Exception {
		return mvc.perform(post("/api/tienda/pedidos").principal(como("ripley")).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"lineas": [{"producto": "copa-de-degustacion", "cantidad": 2}], "entrega": "RECOGIDA"}
						"""));
	}

	private ResultActions avisar() throws Exception {
		return mvc.perform(post("/api/tienda/pagos/aviso").header("Stripe-Signature", "t=1,v1=firma")
				.contentType(MediaType.APPLICATION_JSON).content("{}"));
	}

	private Pedido pendiente() {
		Pedido pedido = Pedido.builder().idPedido(42).referencia("AMD-2026-0042").usuario(ripley)
				.estado(EstadoPedido.PENDIENTE_PAGO).entrega(EntregaPedido.RECOGIDA).subtotal(new BigDecimal("36.00"))
				.gastosEnvio(BigDecimal.ZERO).total(new BigDecimal("36.00")).pagoSesion("cs_test_42")
				.pagoUrl("https://checkout.stripe.com/c/pay/cs_test_42")
				.pagoCaducaEn(LocalDateTime.of(2026, 10, 12, 12, 30)).build();
		pedido.agregarLinea(LineaPedido.builder().producto(copa).nombre(copa.getNombre()).precioUnitario(copa.getPrecio())
				.cantidad(2).importe(new BigDecimal("36.00")).build());
		return pedido;
	}

	private static Principal como(String username) {
		return new UsernamePasswordAuthenticationToken(username, null, List.of());
	}
}
