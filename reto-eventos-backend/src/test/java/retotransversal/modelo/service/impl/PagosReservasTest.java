package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.modelo.dto.ReservaEditarDto;
import retotransversal.modelo.entities.CanceladaPor;
import retotransversal.modelo.entities.Devolucion;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.EstadoPago;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.pagos.EstadoSesionPago;
import retotransversal.modelo.pagos.PasarelaPago;
import retotransversal.modelo.pagos.SesionPago;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.EventoService;
import retotransversal.modelo.service.PagosReservasService;
import retotransversal.modelo.service.UsuarioService;

/** El cobro de las reservas con una pasarela de mentira: qué se cobra, qué se devuelve y cuándo. */
class PagosReservasTest {

	private static final Clock HOY = Clock.fixed(
			LocalDate.of(2026, 10, 17).atTime(12, 0).atZone(ZoneId.of("Europe/Madrid")).toInstant(),
			ZoneId.of("Europe/Madrid"));

	private final ReservaRepository reservas = mock(ReservaRepository.class);
	private final EventoService eventos = mock(EventoService.class);
	private final PasarelaPago pasarela = mock(PasarelaPago.class);
	private final PagosReservasService pagos = new PagosReservasService(reservas, eventos, pasarela, HOY);
	private final ReservaServiceImpl servicio = new ReservaServiceImpl(reservas, eventos, mock(UsuarioService.class),
			pagos);

	private final Evento sesion = Evento.builder().idEvento(3).nombre("Cata de Leche Abducida")
			.fechaInicio(LocalDate.of(2026, 11, 20)).horaInicio(LocalTime.of(19, 15)).duracion(150)
			.estado(EstadoEvento.ACTIVO).aforoMaximo(40).precio(new BigDecimal("35.00")).build();
	private final Usuario ana = Usuario.builder().username("ana").nombre("Ana").email("ana@reto.com").build();

	PagosReservasTest() {
		when(reservas.save(any())).thenAnswer(llamada -> llamada.getArgument(0));
		when(reservas.findByIdBloqueando(anyInt())).thenReturn(Optional.empty());
		when(eventos.admiteCancelaciones(any())).thenReturn(true);
		when(eventos.bloquear(3)).thenReturn(sesion);
	}

	private Reserva reserva(EstadoPago pago, int plazas) {
		Reserva reserva = Reserva.builder().idReserva(7).evento(sesion).usuario(ana).cantidad(plazas)
				.precioVenta(sesion.getPrecio().multiply(BigDecimal.valueOf(plazas))).estadoPago(pago).build();
		if (pago == EstadoPago.PAGADA) {
			reserva.setPagoId("pi_7");
		}
		if (pago == EstadoPago.PENDIENTE) {
			reserva.setPagoSesion("cs_7");
		}
		when(reservas.findById(7)).thenReturn(Optional.of(reserva));
		when(reservas.findByPagoSesion("cs_7")).thenReturn(Optional.of(reserva));
		return reserva;
	}

	@Test
	void aWebBookingWaitsForItsPaymentAndIsConfirmedWhenStripeSaysSo() {
		Reserva reserva = Reserva.builder().idReserva(7).evento(sesion).usuario(ana).cantidad(2)
				.precioVenta(new BigDecimal("70.00")).build();
		when(pasarela.abrirReserva(eq("AM-R-0007"), anyString(), eq(new BigDecimal("35.00")), eq(2), eq("ana@reto.com"),
				eq("/cuenta/reservas?reserva=7")))
				.thenReturn(new SesionPago("cs_7", "https://checkout.stripe.test/cs_7", HOY.instant().plusSeconds(1800)));
		when(reservas.findByPagoSesion("cs_7")).thenReturn(Optional.of(reserva));

		pagos.abrirPago(reserva);
		assertThat(reserva.getEstadoPago()).isEqualTo(EstadoPago.PENDIENTE);
		assertThat(reserva.getPagoUrl()).isEqualTo("https://checkout.stripe.test/cs_7");

		when(pasarela.consultar("cs_7")).thenReturn(new EstadoSesionPago(EstadoSesionPago.Estado.PAGADA, "pi_7"));
		assertThat(pagos.recibirAviso("cs_7")).isTrue();
		assertThat(reserva.getEstadoPago()).isEqualTo(EstadoPago.PAGADA);
		assertThat(reserva.getPagoId()).isEqualTo("pi_7");
		assertThat(reserva.getPagoUrl()).isNull();
	}

	@Test
	void anUnpaidBookingIsAnnulledWhenItsPaymentExpires() {
		Reserva reserva = reserva(EstadoPago.PENDIENTE, 2);
		when(pasarela.consultar("cs_7")).thenReturn(new EstadoSesionPago(EstadoSesionPago.Estado.CADUCADA, null));

		pagos.repasar(7);

		assertThat(reserva.cancelada()).isTrue();
		assertThat(reserva.getCanceladaPor()).isEqualTo(CanceladaPor.SISTEMA);
		assertThat(reserva.getMotivoCancelacion()).isEqualTo("No se completó el pago a tiempo");
	}

	@Test
	void theClientGetsEverythingBackWhenCancelling() {
		Reserva reserva = reserva(EstadoPago.PAGADA, 2);

		servicio.cancelarReserva(7, "ana");

		verify(pasarela).reembolsar("pi_7", new BigDecimal("70.00"), "reembolso-AM-R-0007-70.00");
		assertThat(reserva.getImporteDevuelto()).isEqualByComparingTo("70.00");
		assertThat(reserva.getCanceladaPor()).isEqualTo(CanceladaPor.CLIENTE);
	}

	@Test
	void cancellingAPendingBookingClosesItsPaymentAndRefundsNothing() {
		Reserva reserva = reserva(EstadoPago.PENDIENTE, 1);

		servicio.cancelarReserva(7, "ana");

		verify(pasarela).caducar("cs_7");
		verify(pasarela, never()).reembolsar(anyString(), any(), anyString());
		assertThat(reserva.cancelada()).isTrue();
	}

	@Test
	void theAdminCanCancelWithoutRefunding() {
		Reserva reserva = reserva(EstadoPago.PAGADA, 2);

		servicio.cancelarReservaAdmin(7, "Duplicada: el pago vale para la otra", false);

		verify(pasarela, never()).reembolsar(anyString(), any(), anyString());
		assertThat(reserva.getImporteDevuelto()).isEqualByComparingTo("0");
		assertThat(reserva.cancelada()).isTrue();
	}

	@Test
	void fewerSeatsOnAPaidBookingRefundTheDifferenceButMoreAreRefused() {
		Reserva reserva = reserva(EstadoPago.PAGADA, 3);
		when(reservas.findByEventoIdEventoAndCanceladaEnIsNull(3)).thenReturn(List.of(reserva));

		servicio.editarReservaAdmin(7, new ReservaEditarDto(null, null, null, null, 2, null, null, null));
		verify(pasarela).reembolsar("pi_7", new BigDecimal("35.00"), "reembolso-AM-R-0007-35.00");
		assertThat(reserva.getPrecioVenta()).isEqualByComparingTo("70.00");
		assertThat(reserva.getImporteDevuelto()).isEqualByComparingTo("35.00");

		assertThatThrownBy(() -> servicio.editarReservaAdmin(7, new ReservaEditarDto(null, null, null, null, 4, null,
				null, null)))
				.isInstanceOf(ConflictoNegocioException.class)
				.hasMessage("Ya está pagada y el importe subiría: añade las plazas en una reserva nueva");
	}

	@Test
	void aBookingToPayAtTheDoorIsMarkedAsCollected() {
		Reserva reserva = reserva(EstadoPago.EN_TAQUILLA, 1);

		servicio.marcarCobrada(7);

		assertThat(reserva.getEstadoPago()).isEqualTo(EstadoPago.COBRADA_TAQUILLA);
		assertThat(reserva.getPagadaEn()).isNotNull();
	}

	@Test
	void cancellingASessionRefundsItsBookingsAndReactivatingItCancelsTheRefundedOnes() {
		Reserva pagada = reserva(EstadoPago.PAGADA, 2);
		Reserva enTaquilla = Reserva.builder().idReserva(8).evento(sesion).usuario(ana).cantidad(1)
				.precioVenta(new BigDecimal("35.00")).estadoPago(EstadoPago.EN_TAQUILLA).build();
		when(reservas.findByEventoIdEventoAndCanceladaEnIsNull(3)).thenReturn(List.of(pagada, enTaquilla));
		when(eventos.cancelarEvento(3)).thenReturn(sesion);
		when(eventos.reactivarEvento(3)).thenReturn(sesion);

		pagos.cancelarSesion(3);
		verify(pasarela).reembolsar("pi_7", new BigDecimal("70.00"), "reembolso-AM-R-0007-70.00");
		// La sesión se canceló, no la reserva: sigue viva, con su dinero devuelto.
		assertThat(pagada.cancelada()).isFalse();
		assertThat(enTaquilla.getImporteDevuelto()).isEqualByComparingTo("0");

		pagos.reactivarSesion(3);
		assertThat(pagada.cancelada()).isTrue();
		assertThat(pagada.getCanceladaPor()).isEqualTo(CanceladaPor.SISTEMA);
		assertThat(enTaquilla.cancelada()).isFalse();
	}

	@Test
	void nobodyComesInWhileTheCardPaymentIsPending() {
		Reserva reserva = reserva(EstadoPago.PENDIENTE, 1);
		reserva.getAsistentes().add(retotransversal.modelo.entities.Asistente.builder().orden(1).nombre("Ana")
				.credencial(retotransversal.modelo.entities.Credencial.DNI_NIE).reserva(reserva).build());

		assertThatThrownBy(() -> servicio.marcarEntrada(7, 1, true))
				.isInstanceOf(ConflictoNegocioException.class)
				.hasMessage("Está pendiente de pago con tarjeta: no puede entrar hasta que se pague");
	}

	@Test
	void everyRefundIsRecordedAndADoorRefundStaysPendingUntilHandedOver() {
		Reserva enTaquilla = reserva(EstadoPago.COBRADA_TAQUILLA, 1);
		servicio.cancelarReservaAdmin(7, "No puede venir", true);

		assertThat(enTaquilla.getDevoluciones()).singleElement().satisfies(devolucion -> {
			assertThat(devolucion.getMedio()).isEqualTo(Devolucion.Medio.TAQUILLA);
			assertThat(devolucion.getEstado()).isEqualTo(Devolucion.Estado.PENDIENTE);
			assertThat(devolucion.getImporte()).isEqualByComparingTo("35.00");
		});
		enTaquilla.getDevoluciones().getFirst().setIdDevolucion(1);
		servicio.entregarDevolucion(7, 1);
		assertThat(enTaquilla.getDevoluciones().getFirst().getEstado()).isEqualTo(Devolucion.Estado.HECHA);
		assertThat(enTaquilla.getDevoluciones().getFirst().getHechaEn()).isNotNull();
	}

	@Test
	void aCardRefundKeepsStripesReference() {
		Reserva pagada = reserva(EstadoPago.PAGADA, 2);
		when(pasarela.reembolsar(eq("pi_7"), any(), anyString())).thenReturn("re_123");

		servicio.cancelarReserva(7, "ana");

		assertThat(pagada.getDevoluciones()).singleElement().satisfies(devolucion -> {
			assertThat(devolucion.getMedio()).isEqualTo(Devolucion.Medio.TARJETA);
			assertThat(devolucion.getEstado()).isEqualTo(Devolucion.Estado.HECHA);
			assertThat(devolucion.getReferencia()).isEqualTo("re_123");
			assertThat(devolucion.getMotivo()).isEqualTo("Cancelación del cliente");
		});
	}
}
