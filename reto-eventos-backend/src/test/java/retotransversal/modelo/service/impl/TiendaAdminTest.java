package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
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
import retotransversal.modelo.pagos.PasarelaPago;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ProductoRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.restcontroller.AdminPedidoRestController;

/** El centro de distribución por HTTP: el orden de los pasos, quién se puede anular y la devolución. */
class TiendaAdminTest {

	private final ProductoRepository productos = mock(ProductoRepository.class);
	private final PedidoRepository pedidos = mock(PedidoRepository.class);
	private final PasarelaPago pasarela = mock(PasarelaPago.class);

	private final Producto copa = Producto.builder().idProducto(7).slug("copa-de-degustacion")
			.nombre("Copa de degustación").categoria(CategoriaProducto.MESA).precio(new BigDecimal("18.00"))
			.existencias(90).build();
	private final Usuario ripley = Usuario.builder().username("ripley").email("ripley@nostromo.space").build();
	private final Instant ahora = Instant.parse("2026-10-13T10:00:00Z");

	@Test
	void theListShowsWhoOrderedWhereToWriteAndWhatComesNext() throws Exception {
		Pedido deCuenta = confirmado(41, EntregaPedido.ENVIO);
		Pedido deInvitado = confirmado(42, EntregaPedido.RECOGIDA);
		deInvitado.setUsuario(null);
		deInvitado.setNombre("Lena Kepler");
		deInvitado.setCorreo("lena@pelagia.ae");
		when(pedidos.findAllByOrderByCreadoEnDescIdPedidoDesc()).thenReturn(List.of(deCuenta, deInvitado));

		mvc(null).perform(get("/api/admin/pedidos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].cuenta").value("ripley"))
				.andExpect(jsonPath("$[0].correo").value("ripley@nostromo.space"))
				.andExpect(jsonPath("$[0].siguiente").value("ENVIADO"))
				.andExpect(jsonPath("$[0].anulable").value(true))
				.andExpect(jsonPath("$[1].cuenta").doesNotExist())
				.andExpect(jsonPath("$[1].correo").value("lena@pelagia.ae"))
				.andExpect(jsonPath("$[1].pedido.nombre").value("Lena Kepler"))
				.andExpect(jsonPath("$[1].siguiente").value("ENTREGADO"));
	}

	@Test
	void aShipmentLeavesAndThenArrives() throws Exception {
		Pedido pedido = confirmado(42, EntregaPedido.ENVIO);
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));
		MockMvc mvc = mvc(null);

		avanzar(mvc, "ENVIADO")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pedido.estado").value("ENVIADO"))
				.andExpect(jsonPath("$.pedido.enviadoEn").isNotEmpty())
				.andExpect(jsonPath("$.siguiente").value("ENTREGADO"))
				.andExpect(jsonPath("$.anulable").value(false));
		avanzar(mvc, "ENTREGADO")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pedido.estado").value("ENTREGADO"))
				.andExpect(jsonPath("$.siguiente").doesNotExist());

		assertThat(pedido.getEnviadoEn()).isEqualTo(LocalDateTime.of(2026, 10, 13, 12, 0));
		assertThat(pedido.getEntregadoEn()).isEqualTo(LocalDateTime.of(2026, 10, 13, 12, 0));
	}

	@Test
	void aPickupIsHandedOverWithoutLeaving() throws Exception {
		Pedido pedido = confirmado(42, EntregaPedido.RECOGIDA);
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));
		MockMvc mvc = mvc(null);

		avanzar(mvc, "ENVIADO").andExpect(status().isConflict());
		avanzar(mvc, "ENTREGADO").andExpect(status().isOk()).andExpect(jsonPath("$.pedido.estado").value("ENTREGADO"));

		assertThat(pedido.getEnviadoEn()).isNull();
	}

	@Test
	void stepsCannotBeSkippedNorUndone() throws Exception {
		Pedido pedido = confirmado(42, EntregaPedido.ENVIO);
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));
		MockMvc mvc = mvc(null);

		avanzar(mvc, "ENTREGADO")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("El pedido AMD-2026-0042 no puede pasar a ENTREGADO"));
		avanzar(mvc, "CONFIRMADO").andExpect(status().isConflict());
		mvc.perform(patch("/api/admin/pedidos/42").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isConflict());

		pedido.setEstado(EstadoPedido.PENDIENTE_PAGO);
		avanzar(mvc, "ENVIADO").andExpect(status().isConflict());
		assertThat(pedido.getEnviadoEn()).isNull();
	}

	@Test
	void cancellingAPaidOrderRefundsItAndReturnsTheUnits() throws Exception {
		Pedido pedido = confirmado(42, EntregaPedido.ENVIO);
		pedido.setPagoId("pi_42");
		pedido.setPagadoEn(LocalDateTime.of(2026, 10, 13, 11, 0));
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));
		when(pasarela.reembolsar("pi_42")).thenReturn("re_42");

		mvc(pasarela).perform(post("/api/admin/pedidos/42/anulacion"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pedido.estado").value("ANULADO"))
				.andExpect(jsonPath("$.reembolsado").value(true))
				.andExpect(jsonPath("$.anulable").value(false));

		verify(productos).devolverExistencias(7, 2);
	}

	@Test
	void anOrderThatHasLeftCannotBeCancelled() throws Exception {
		Pedido pedido = confirmado(42, EntregaPedido.ENVIO);
		pedido.setEstado(EstadoPedido.ENVIADO);
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));

		mvc(null).perform(post("/api/admin/pedidos/42/anulacion")).andExpect(status().isConflict());

		verify(productos, never()).devolverExistencias(anyInt(), anyInt());
	}

	/** Sin pasarela, la tienda de demostración; con ella, la que cobra. */
	private MockMvc mvc(PasarelaPago conPasarela) {
		Clock reloj = Clock.fixed(ahora, ZoneId.of("Europe/Madrid"));
		TiendaServiceImpl servicio = new TiendaServiceImpl(productos, pedidos, mock(UsuarioRepository.class),
				mock(LimitadorSolicitudes.class), conPasarela, mock(EntityManager.class), reloj);
		return MockMvcBuilders.standaloneSetup(new AdminPedidoRestController(servicio))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	private static ResultActions avanzar(MockMvc mvc, String estado) throws Exception {
		return mvc.perform(patch("/api/admin/pedidos/42").contentType(MediaType.APPLICATION_JSON)
				.content("{\"estado\": \"" + estado + "\"}"));
	}

	private Pedido confirmado(int id, EntregaPedido entrega) {
		Pedido pedido = Pedido.builder().idPedido(id).referencia("AMD-2026-%04d".formatted(id)).usuario(ripley)
				.estado(EstadoPedido.CONFIRMADO).entrega(entrega)
				.direccion(entrega == EntregaPedido.ENVIO ? "Muelle 3, Estación Pelagia" : null)
				.subtotal(new BigDecimal("36.00")).gastosEnvio(BigDecimal.ZERO).total(new BigDecimal("36.00"))
				.creadoEn(LocalDateTime.of(2026, 10, 13, 9, 0)).build();
		pedido.agregarLinea(LineaPedido.builder().producto(copa).nombre(copa.getNombre()).precioUnitario(copa.getPrecio())
				.cantidad(2).importe(new BigDecimal("36.00")).build());
		return pedido;
	}
}
