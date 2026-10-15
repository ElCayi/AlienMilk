package retotransversal.modelo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import retotransversal.modelo.dto.ExpedienteCapaDto;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Expediente;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ExpedienteRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.impl.EventoServiceImpl;
import retotransversal.modelo.service.impl.ExpedienteServiceImpl;

/** Las sesiones de ejemplo: el catálogo es válido, se eligen las que faltan y van una por semana. */
class SesionesDemoServiceTest {

	private static final LocalDate HOY = LocalDate.of(2026, 10, 15);
	private static final Clock RELOJ = Clock.fixed(HOY.atStartOfDay(EventoServiceImpl.ZONA).toInstant(),
			EventoServiceImpl.ZONA);

	private final EventoRepository eventos = mock(EventoRepository.class);
	private final TipoEventoRepository tipos = mock(TipoEventoRepository.class);
	private final ExpedienteRepository expedientes = mock(ExpedienteRepository.class);
	// Los servicios de verdad: así cada plantilla pasa la misma validación que un alta desde el panel.
	private final EventoServiceImpl eventoService = new EventoServiceImpl(eventos, mock(ReservaRepository.class), RELOJ);
	private final ExpedienteServiceImpl expedienteService = new ExpedienteServiceImpl(expedientes, eventos);
	private final AtomicInteger ids = new AtomicInteger(100);

	SesionesDemoServiceTest() {
		when(tipos.findByNombre(anyString()))
				.thenAnswer(llamada -> Optional.of(TipoEvento.builder().idTipo(1).nombre(llamada.getArgument(0)).build()));
		when(eventos.save(any())).thenAnswer(llamada -> {
			Evento evento = llamada.getArgument(0);
			evento.setIdEvento(ids.incrementAndGet());
			return evento;
		});
		when(eventos.existsById(any())).thenReturn(true);
	}

	@Test
	void everySessionInTheCatalogueIsValidWithItsDossier() {
		SesionesDemoService catalogo = new SesionesDemoService(eventos, tipos, eventoService, expedienteService);
		List<Evento> programa = new ArrayList<>();
		when(eventos.findAll()).thenAnswer(llamada -> List.copyOf(programa));

		// Tres pulsaciones recorren las ocho plantillas: ninguna falla al validarse.
		for (int vez = 0; vez < 3; vez++) {
			programa.addAll(catalogo.anadir());
		}
		Set<String> nombres = new HashSet<>(programa.stream().map(Evento::getNombre).toList());
		assertThat(programa).hasSize(9).allSatisfy(evento -> assertThat(evento.getHoraInicio()).isNotNull());
		assertThat(nombres).hasSize(9).contains("Degustación de Calostro de Ganímedes",
				"Laboratorio de Texturas Volátiles", "Degustación de Calostro de Ganímedes · II");
		verify(expedientes, times(9)).save(any(Expediente.class));
	}

	@Test
	void theMissingOnesComeFirstThenANewRoundWeeklyAfterTheLastActiveSession() {
		SesionesDemoService servicio = new SesionesDemoService(eventos, tipos, eventoService, expedienteService,
				List.of(plantilla("Cata A"), plantilla("Cata B"), plantilla("Cata C"), plantilla("Cata D")), RELOJ);
		when(eventos.findAll()).thenReturn(List.of(
				sesion("Cata A", LocalDate.of(2026, 12, 1), EstadoEvento.ACTIVO),
				sesion("Cata B", LocalDate.of(2027, 2, 1), EstadoEvento.CANCELADO),
				sesion("Cata B · II", LocalDate.of(2026, 11, 1), EstadoEvento.ACTIVO)));

		List<Evento> creadas = servicio.anadir();

		assertThat(creadas).extracting(Evento::getNombre).containsExactly("Cata C", "Cata D", "Cata A · II");
		assertThat(creadas).extracting(Evento::getFechaInicio).containsExactly(
				LocalDate.of(2026, 12, 8), LocalDate.of(2026, 12, 15), LocalDate.of(2026, 12, 22));
	}

	private static SesionesDemoService.Plantilla plantilla(String nombre) {
		return new SesionesDemoService.Plantilla(nombre, "Una cata", "CATA_COSMICA", LocalTime.of(19, 0), 90,
				"Hangar 7", 40, 10, new BigDecimal("20.00"), new ExpedienteCapaDto("Entradilla", null, null, null,
						null, null, null, null, null, null, null));
	}

	private static Evento sesion(String nombre, LocalDate fecha, EstadoEvento estado) {
		return Evento.builder().nombre(nombre).fechaInicio(fecha).estado(estado).build();
	}
}
