package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.CategoriaProducto;
import retotransversal.modelo.entities.EntregaPedido;
import retotransversal.modelo.entities.EstadoPedido;
import retotransversal.modelo.entities.LineaPedido;
import retotransversal.modelo.entities.Pedido;
import retotransversal.modelo.entities.Producto;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.PedidoRepository;
import retotransversal.modelo.repository.ProductoRepository;
import retotransversal.modelo.repository.UsuarioRepository;
import retotransversal.modelo.service.TiendaService;
import retotransversal.restcontroller.TiendaRestController;

/** El pedido por HTTP, con el servicio real y los repositorios simulados. */
class TiendaContractTest {

	private final ProductoRepository productos = mock(ProductoRepository.class);
	private final PedidoRepository pedidos = mock(PedidoRepository.class);
	private final UsuarioRepository usuarios = mock(UsuarioRepository.class);

	private final Producto ceto = producto(3, "leche-entera-ceto-iv", "Leche entera de Ceto IV", "6.40", 148);
	private final Producto pelagia = producto(1, "leche-de-pelagia", "Leche de Pelagia", "9.80", 3);
	private final Producto copa = producto(7, "copa-de-degustacion", "Copa de degustación", "18.00", 90);
	private final Usuario ripley = Usuario.builder().username("ripley").build();

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		when(usuarios.findById("ripley")).thenReturn(Optional.of(ripley));
		when(productos.findAllBySlugIn(any())).thenAnswer(call -> {
			Collection<String> slugs = call.getArgument(0);
			return List.of(ceto, pelagia, copa).stream().filter(p -> slugs.contains(p.getSlug())).toList();
		});
		when(productos.retirarExistencias(anyInt(), anyInt())).thenReturn(1);
		when(pedidos.save(any())).thenAnswer(call -> {
			Pedido pedido = call.getArgument(0);
			pedido.setIdPedido(42);
			return pedido;
		});
		Clock reloj = Clock.fixed(Instant.parse("2026-10-09T10:00:00Z"), ZoneId.of("Europe/Madrid"));
		TiendaServiceImpl servicio = new TiendaServiceImpl(productos, pedidos, usuarios, reloj);
		mvc = MockMvcBuilders.standaloneSetup(new TiendaRestController(servicio))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void pricesComeFromTheCatalogueNotFromTheBrowser() throws Exception {
		pedir("""
				{"lineas": [{"producto": "leche-entera-ceto-iv", "cantidad": 2, "precio": 0.01},
				            {"producto": "copa-de-degustacion", "cantidad": 1}],
				 "entrega": "RECOGIDA"}
				""")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.referencia").value("AMD-2026-0042"))
				.andExpect(jsonPath("$.estado").value("CONFIRMADO"))
				.andExpect(jsonPath("$.lineas[0].nombre").value("Leche entera de Ceto IV"))
				.andExpect(jsonPath("$.lineas[0].importe").value(12.80))
				.andExpect(jsonPath("$.subtotal").value(30.80))
				.andExpect(jsonPath("$.gastosEnvio").value(0))
				.andExpect(jsonPath("$.total").value(30.80))
				.andExpect(jsonPath("$.direccion").doesNotExist());
	}

	@Test
	void refrigeratedShippingIsFreeOnlyFromTheThreshold() throws Exception {
		pedir("""
				{"lineas": [{"producto": "copa-de-degustacion", "cantidad": 2}],
				 "entrega": "ENVIO", "direccion": "  Muelle de San Diego, nave 3  "}
				""")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.gastosEnvio").value(4.90))
				.andExpect(jsonPath("$.total").value(40.90))
				.andExpect(jsonPath("$.direccion").value("Muelle de San Diego, nave 3"));

		assertThat(TiendaServiceImpl.gastosEnvio(EntregaPedido.ENVIO, new BigDecimal("40.00")))
				.isEqualByComparingTo("0");
		assertThat(TiendaServiceImpl.gastosEnvio(EntregaPedido.ENVIO, new BigDecimal("39.99")))
				.isEqualByComparingTo("4.90");
	}

	@Test
	void stockIsTakenInProductOrderAndAShortageCancelsEverything() throws Exception {
		when(productos.retirarExistencias(eq(1), anyInt())).thenReturn(0);

		pedir("""
				{"lineas": [{"producto": "copa-de-degustacion", "cantidad": 1},
				            {"producto": "leche-de-pelagia", "cantidad": 5}],
				 "entrega": "RECOGIDA"}
				""")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Solo quedan 3 unidades de «Leche de Pelagia»"));

		InOrder orden = inOrder(productos);
		orden.verify(productos).retirarExistencias(1, 5);
		verify(productos, never()).retirarExistencias(eq(7), anyInt());
		verify(pedidos, never()).save(any());
	}

	@Test
	void reportsEveryProblemWithTheOrderAtOnce() throws Exception {
		pedir("""
				{"lineas": [], "entrega": null}
				""")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.lineas").value("Su pedido está vacío"))
				.andExpect(jsonPath("$.errores.entrega").value("Elija cómo quiere recibir el pedido"));

		pedir("""
				{"lineas": [{"producto": "leche-entera-ceto-iv", "cantidad": 4},
				            {"producto": "leche-entera-ceto-iv", "cantidad": 3}],
				 "entrega": "ENVIO", "direccion": " "}
				""")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.lineas").value("Como máximo 6 unidades de cada producto por pedido"))
				.andExpect(jsonPath("$.errores.direccion").value("Indique la dirección de entrega"));

		verify(productos, never()).retirarExistencias(anyInt(), anyInt());
	}

	@Test
	void aProductThatLeftTheCatalogueStopsTheOrder() throws Exception {
		pedir("""
				{"lineas": [{"producto": "leche-de-otro-sitio", "cantidad": 1}], "entrega": "RECOGIDA"}
				""")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Uno de los productos de su pedido ya no está a la venta"));
	}

	@Test
	void cancellingReturnsTheUnitsAndOnlyOnce() throws Exception {
		Pedido pedido = pedidoDe(ripley, EstadoPedido.CONFIRMADO);
		when(pedidos.findById(42)).thenReturn(Optional.of(pedido));

		mvc.perform(post("/api/tienda/pedidos/42/anulacion").principal(como("ripley")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("ANULADO"));
		verify(productos).devolverExistencias(3, 2);

		mvc.perform(post("/api/tienda/pedidos/42/anulacion").principal(como("ripley")))
				.andExpect(status().isConflict());
		mvc.perform(post("/api/tienda/pedidos/42/anulacion").principal(como("dallas")))
				.andExpect(status().isForbidden());
	}

	@Test
	void theCatalogueCarriesTheRulesItIsChargedBy() throws Exception {
		when(productos.findAllByActivoTrueOrderByOrdenAsc()).thenReturn(List.of(ceto, copa));

		mvc.perform(get("/api/tienda/catalogo"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.condiciones.gastosEnvio").value(4.90))
				.andExpect(jsonPath("$.condiciones.envioGratisDesde").value(40.00))
				.andExpect(jsonPath("$.condiciones.unidadesMaximas").value(6))
				.andExpect(jsonPath("$.productos[1].slug").value("copa-de-degustacion"));
	}

	@Test
	void springBuildsTheShopWithItsProductionConstructor() {
		new ApplicationContextRunner()
				.withBean(ProductoRepository.class, () -> productos)
				.withBean(PedidoRepository.class, () -> pedidos)
				.withBean(UsuarioRepository.class, () -> usuarios)
				.withBean(TiendaServiceImpl.class)
				.run(context -> assertThat(context).hasNotFailed().hasSingleBean(TiendaService.class));
	}

	private ResultActions pedir(String cuerpo) throws Exception {
		return mvc.perform(post("/api/tienda/pedidos").principal(como("ripley"))
				.contentType(MediaType.APPLICATION_JSON).content(cuerpo));
	}

	private static Principal como(String username) {
		return new UsernamePasswordAuthenticationToken(username, null, List.of());
	}

	private Pedido pedidoDe(Usuario usuario, EstadoPedido estado) {
		Pedido pedido = Pedido.builder().idPedido(42).referencia("AMD-2026-0042").usuario(usuario).estado(estado)
				.entrega(EntregaPedido.RECOGIDA).subtotal(new BigDecimal("12.80")).gastosEnvio(BigDecimal.ZERO)
				.total(new BigDecimal("12.80")).build();
		pedido.agregarLinea(LineaPedido.builder().producto(ceto).nombre(ceto.getNombre())
				.precioUnitario(ceto.getPrecio()).cantidad(2).importe(new BigDecimal("12.80")).build());
		return pedido;
	}

	private static Producto producto(int id, String slug, String nombre, String precio, int existencias) {
		return Producto.builder().idProducto(id).slug(slug).nombre(nombre).categoria(CategoriaProducto.LECHE)
				.precio(new BigDecimal(precio)).existencias(existencias).build();
	}
}
