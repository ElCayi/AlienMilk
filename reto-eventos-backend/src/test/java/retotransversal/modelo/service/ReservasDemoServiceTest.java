package retotransversal.modelo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Perfil;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.UsuarioRepository;

/** Las reservas de ejemplo: cuentas de demostración si faltan, sin repetir pareja y sin pasar del aforo. */
class ReservasDemoServiceTest {

	private final EventoRepository eventos = mock(EventoRepository.class);
	private final ReservaRepository reservas = mock(ReservaRepository.class);
	private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
	private final UsuarioService usuarioService = mock(UsuarioService.class);
	private final PerfilService perfilService = mock(PerfilService.class);
	private final EventoService eventoService = mock(EventoService.class);
	private final ReservaService reservaService = mock(ReservaService.class);

	private final ReservasDemoService servicio = new ReservasDemoService(eventos, reservas, usuarios, usuarioService,
			perfilService, eventoService, reservaService);

	@Test
	void createsTheMissingDemoClientsAndSpreadsBookingsWithinTheFreeSeats() {
		Perfil cliente = Perfil.builder().idPerfil(2).nombre("ROLE_CLIENTE").build();
		when(perfilService.findByNombre("ROLE_CLIENTE")).thenReturn(cliente);
		when(usuarioService.findByPerfilNombre("ROLE_CLIENTE")).thenReturn(List.of(
				Usuario.builder().username("ana").enabled(1).perfil(cliente).build(),
				Usuario.builder().username("luis").enabled(1).perfil(cliente).build()));
		when(usuarioService.insertOne(any())).thenAnswer(llamada -> llamada.getArgument(0));
		Evento casiLlena = sesion(1, 2);
		Evento amplia = sesion(2, 100);
		when(eventos.findByEstado(EstadoEvento.ACTIVO)).thenReturn(List.of(casiLlena, amplia));
		when(eventoService.admiteReservas(any())).thenReturn(true);
		when(reservas.findAll()).thenReturn(List.of());
		when(reservaService.reservarEvento(anyInt(), anyString(), anyInt(), any())).thenAnswer(llamada -> Reserva
				.builder()
				.evento(llamada.<Integer>getArgument(0) == 1 ? casiLlena : amplia)
				.usuario(Usuario.builder().username(llamada.getArgument(1)).build())
				.cantidad(llamada.getArgument(2))
				.build());

		List<Reserva> creadas = servicio.anadir();

		verify(usuarioService, times(ReservasDemoService.CLIENTES_MINIMOS - 2)).insertOne(any());
		assertThat(creadas).hasSize(ReservasDemoService.POR_VEZ);
		Set<String> parejas = new HashSet<>();
		assertThat(creadas).allSatisfy(reserva -> assertThat(
				parejas.add(reserva.getUsuario().getUsername() + "#" + reserva.getEvento().getIdEvento())).isTrue());
		assertThat(creadas.stream().map(reserva -> reserva.getUsuario().getUsername()).distinct().count())
				.as("repartidas entre varias personas").isGreaterThanOrEqualTo(4);
		Map<Integer, Integer> plazas = creadas.stream().collect(
				Collectors.groupingBy(reserva -> reserva.getEvento().getIdEvento(), Collectors.summingInt(Reserva::getCantidad)));
		assertThat(plazas.getOrDefault(1, 0)).isLessThanOrEqualTo(2);
	}

	private static Evento sesion(int id, int aforo) {
		return Evento.builder().idEvento(id).fechaInicio(LocalDate.of(2026, 12, id)).horaInicio(LocalTime.of(19, 0))
				.duracion(90).aforoMaximo(aforo).estado(EstadoEvento.ACTIVO).build();
	}
}
