package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.persistence.EntityManager;
import retotransversal.modelo.dto.LineaPedidoCrearDto;
import retotransversal.modelo.dto.PedidoCrearDto;
import retotransversal.modelo.dto.PedidoDto;
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
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.modelo.service.PedidoAvisoEvent;
import retotransversal.modelo.service.PedidoAvisoEvent.Motivo;

/** Cada cambio que el comprador debe saber publica su aviso, con su correo y su enlace. */
class TiendaAvisosTest {

	private final ProductoRepository productos = mock(ProductoRepository.class);
	private final PedidoRepository pedidos = mock(PedidoRepository.class);
	private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
	private final List<PedidoAvisoEvent> avisos = new ArrayList<>();

	private final Producto copa = Producto.builder().idProducto(7).slug("copa-de-degustacion")
			.nombre("Copa de degustación").categoria(CategoriaProducto.MESA).precio(new BigDecimal("18.00"))
			.existencias(90).build();
	private final Usuario ripley = Usuario.builder().username("ripley").nombre("Ellen")
			.email("ripley@nostromo.example").build();

	private TiendaServiceImpl servicio;

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
		Clock reloj = Clock.fixed(Instant.parse("2026-10-14T10:00:00Z"), ZoneId.of("Europe/Madrid"));
		servicio = new TiendaServiceImpl(productos, pedidos, usuarios, mock(LimitadorSolicitudes.class), null,
				mock(EntityManager.class), reloj, evento -> avisos.add((PedidoAvisoEvent) evento),
				"https://alienmilk.example/");
	}

	@Test
	void aGuestGetsThePrivateLinkWithTheFirstMessage() {
		PedidoDto pedido = servicio.crearPedidoInvitado(new PedidoCrearDto(
				List.of(new LineaPedidoCrearDto("copa-de-degustacion", 1)), EntregaPedido.RECOGIDA, null,
				"Dallas", "dallas@nostromo.example"), "203.0.113.7");

		assertThat(avisos).singleElement().satisfies(aviso -> {
			assertThat(aviso.motivo()).isEqualTo(Motivo.RECIBIDO);
			assertThat(aviso.correo()).isEqualTo("dallas@nostromo.example");
			assertThat(aviso.nombre()).isEqualTo("Dallas");
			assertThat(aviso.enlace())
					.isEqualTo("https://alienmilk.example/tienda/pedido/AMD-2026-0042#" + pedido.clave());
			// La clave va en el enlace, nunca en el pedido que viaja con el aviso.
			assertThat(aviso.pedido().clave()).isNull();
		});
	}

	@Test
	void anAccountIsSentToItsPanel() {
		servicio.crearPedido("ripley", new PedidoCrearDto(List.of(new LineaPedidoCrearDto("copa-de-degustacion", 2)),
				EntregaPedido.ENVIO, "Muelle 3, Estación Pelagia", null, null));

		assertThat(avisos).singleElement().satisfies(aviso -> {
			assertThat(aviso.correo()).isEqualTo("ripley@nostromo.example");
			assertThat(aviso.nombre()).isEqualTo("Ellen");
			assertThat(aviso.enlace()).isEqualTo("https://alienmilk.example/cuenta/pedidos");
		});
	}

	@Test
	void shippingAndCancellingAreAnnounced() {
		Pedido enviado = confirmado(43);
		when(pedidos.findById(43)).thenReturn(Optional.of(enviado));
		servicio.avanzarPedido(43, EstadoPedido.ENVIADO);

		Pedido anulado = confirmado(44);
		when(pedidos.findById(44)).thenReturn(Optional.of(anulado));
		servicio.anularPedido(44, "ripley");

		assertThat(avisos).extracting(PedidoAvisoEvent::motivo).containsExactly(Motivo.ENVIADO, Motivo.ANULADO);
		assertThat(avisos.get(0).pedido().enviadoEn()).isNotNull();
		assertThat(avisos.get(1).reembolsado()).isFalse();
	}

	@Test
	void aRejectedChangeAnnouncesNothing() {
		Pedido pedido = confirmado(45);
		pedido.setEstado(EstadoPedido.ENVIADO);
		when(pedidos.findById(45)).thenReturn(Optional.of(pedido));

		try {
			servicio.anularPedido(45, "ripley");
		} catch (RuntimeException esperado) {
			// Ya ha salido: no se puede anular.
		}

		assertThat(avisos).isEmpty();
	}

	private Pedido confirmado(int id) {
		Pedido pedido = Pedido.builder().idPedido(id).referencia("AMD-2026-%04d".formatted(id)).usuario(ripley)
				.estado(EstadoPedido.CONFIRMADO).entrega(EntregaPedido.ENVIO).direccion("Muelle 3, Estación Pelagia")
				.subtotal(new BigDecimal("18.00")).gastosEnvio(new BigDecimal("4.90")).total(new BigDecimal("22.90"))
				.creadoEn(LocalDateTime.of(2026, 10, 13, 9, 0)).build();
		pedido.agregarLinea(LineaPedido.builder().producto(copa).nombre(copa.getNombre())
				.precioUnitario(copa.getPrecio()).cantidad(1).importe(new BigDecimal("18.00")).build());
		return pedido;
	}
}
