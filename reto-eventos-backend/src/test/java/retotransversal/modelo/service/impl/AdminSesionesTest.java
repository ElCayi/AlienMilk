package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.ReservaRepository.OcupacionEvento;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.ExpedienteService;
import retotransversal.modelo.service.ImagenSesionService;
import retotransversal.modelo.service.UsuarioService;
import retotransversal.restcontroller.AdminEventoRestController;

/** Sesiones desde el panel: el estado no cambia al editar, la ocupación manda y con reservas se cancela. */
class AdminSesionesTest {

	/** Hoy es el 14 de octubre de 2026 en Madrid. */
	private static final Clock HOY = Clock.fixed(
			LocalDate.of(2026, 10, 14).atTime(12, 0).atZone(ZoneId.of("Europe/Madrid")).toInstant(),
			ZoneId.of("Europe/Madrid"));

	private final EventoRepository eventos = mock(EventoRepository.class);
	private final ReservaRepository reservas = mock(ReservaRepository.class);
	private final TipoEventoRepository tipos = mock(TipoEventoRepository.class);
	private final TipoEvento cata = TipoEvento.builder().idTipo(1).nombre("CATA_COSMICA").build();

	private final MockMvc mvc = MockMvcBuilders
			.standaloneSetup(new AdminEventoRestController(new EventoServiceImpl(eventos, reservas, HOY), tipos,
					mock(ExpedienteService.class), mock(ImagenSesionService.class)))
			.setControllerAdvice(new GlobalExceptionHandler()).build();

	@Test
	void theListCarriesEachSessionsOccupancy() throws Exception {
		when(eventos.findAll()).thenReturn(List.of(sesion(7, EstadoEvento.ACTIVO), sesion(8, EstadoEvento.CANCELADO)));
		when(reservas.ocupacionPorEvento()).thenReturn(List.of(ocupacion(7, 12, 3)));

		mvc.perform(get("/api/admin/eventos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].idEvento").value(7))
				.andExpect(jsonPath("$[0].plazasReservadas").value(12))
				.andExpect(jsonPath("$[0].reservas").value(3))
				.andExpect(jsonPath("$[0].tipoEvento").value("CATA_COSMICA"))
				.andExpect(jsonPath("$[1].plazasReservadas").value(0))
				.andExpect(jsonPath("$[1].estado").value("CANCELADO"));
	}

	@Test
	void editingACancelledSessionKeepsItCancelled() throws Exception {
		when(eventos.findById(8)).thenReturn(Optional.of(sesion(8, EstadoEvento.CANCELADO)));
		when(tipos.findById(1)).thenReturn(Optional.of(cata));
		when(eventos.save(any())).thenAnswer(call -> call.getArgument(0));

		mvc.perform(put("/api/admin/eventos/8").contentType(MediaType.APPLICATION_JSON).content(formulario(40)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("CANCELADO"))
				.andExpect(jsonPath("$.nombre").value("Cata de Leche Abducida"));
	}

	@Test
	void theCapacityCannotDropBelowTheSeatsAlreadyReserved() throws Exception {
		when(eventos.findById(7)).thenReturn(Optional.of(sesion(7, EstadoEvento.ACTIVO)));
		when(tipos.findById(1)).thenReturn(Optional.of(cata));
		when(reservas.findByEventoIdEvento(7)).thenReturn(List.of(reserva(30), reserva(15)));

		mvc.perform(put("/api/admin/eventos/7").contentType(MediaType.APPLICATION_JSON).content(formulario(40)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.aforoMaximo")
						.value("Ya hay 45 plazas reservadas: el aforo no puede ser menor"));
		verify(eventos, never()).save(any());
	}

	@Test
	void everyMissingFieldIsReportedAtOnce() throws Exception {
		mvc.perform(post("/api/admin/eventos")
				.contentType(MediaType.APPLICATION_JSON).content("{\"precio\": -1, \"aforoMaximo\": 10, \"minimoAsistencia\": 20}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.nombre").exists())
				.andExpect(jsonPath("$.errores.fechaInicio").exists())
				.andExpect(jsonPath("$.errores.horaInicio").value("Indica la hora de inicio"))
				.andExpect(jsonPath("$.errores.direccion").exists())
				.andExpect(jsonPath("$.errores.idTipo").exists())
				.andExpect(jsonPath("$.errores.duracion").exists())
				.andExpect(jsonPath("$.errores.precio").value("El precio no puede ser negativo"))
				.andExpect(jsonPath("$.errores.minimoAsistencia").value("No puede superar el aforo"));
	}

	@Test
	void aSessionWithReservationsIsCancelledNotDeleted() throws Exception {
		when(eventos.findById(7)).thenReturn(Optional.of(sesion(7, EstadoEvento.ACTIVO)));
		when(reservas.findByEventoIdEvento(7)).thenReturn(List.of(reserva(2), reserva(3)));

		mvc.perform(delete("/api/admin/eventos/7"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Tiene 2 reservas: cancela la sesión en lugar de borrarla"));
		verify(eventos, never()).deleteById(any());
	}

	@Test
	void aSessionWithReservationsIsDeletedWithThemOnlyWhenConfirmed() throws Exception {
		when(eventos.findById(7)).thenReturn(Optional.of(sesion(7, EstadoEvento.ACTIVO)));
		List<Reserva> suyas = List.of(reserva(2), reserva(3));
		when(reservas.findByEventoIdEvento(7)).thenReturn(suyas);

		mvc.perform(delete("/api/admin/eventos/7").param("conReservas", "true")).andExpect(status().isNoContent());
		verify(reservas).deleteAll(suyas);
		verify(eventos).deleteById(7);
	}

	@Test
	void onlySessionsNoLongerActiveAreArchivedAndArchivedOnesAreNotReactivated() throws Exception {
		Evento cancelada = sesion(8, EstadoEvento.CANCELADO);
		when(eventos.findById(7)).thenReturn(Optional.of(sesion(7, EstadoEvento.ACTIVO)));
		when(eventos.findById(8)).thenReturn(Optional.of(cancelada));
		when(eventos.save(any())).thenAnswer(call -> call.getArgument(0));

		mvc.perform(patch("/api/admin/eventos/7/archivar")).andExpect(status().isConflict());
		mvc.perform(patch("/api/admin/eventos/8/archivar"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.archivada").value(true));
		mvc.perform(patch("/api/admin/eventos/8/reactivar")).andExpect(status().isConflict());
		mvc.perform(patch("/api/admin/eventos/8/desarchivar"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.archivada").value(false));
	}

	@Test
	void aSessionWithoutReservationsCanBeDeleted() throws Exception {
		when(eventos.findById(9)).thenReturn(Optional.of(sesion(9, EstadoEvento.ACTIVO)));
		when(reservas.findByEventoIdEvento(9)).thenReturn(List.of());

		mvc.perform(delete("/api/admin/eventos/9")).andExpect(status().isNoContent());
		verify(eventos).deleteById(9);
	}

	@Test
	void cancellingAndReactivatingOnlyGoOneWayEach() throws Exception {
		when(eventos.findById(7)).thenReturn(Optional.of(sesion(7, EstadoEvento.ACTIVO)));
		when(eventos.findById(8)).thenReturn(Optional.of(sesion(8, EstadoEvento.CANCELADO)));
		when(eventos.save(any())).thenAnswer(call -> call.getArgument(0));

		mvc.perform(patch("/api/admin/eventos/7/reactivar")).andExpect(status().isConflict());
		mvc.perform(patch("/api/admin/eventos/8/cancelar")).andExpect(status().isConflict());
		mvc.perform(patch("/api/admin/eventos/7/cancelar"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("CANCELADO"));
		mvc.perform(patch("/api/admin/eventos/8/reactivar"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("ACTIVO"));

		ArgumentCaptor<Evento> guardados = ArgumentCaptor.forClass(Evento.class);
		verify(eventos, times(2)).save(guardados.capture());
		assertThat(guardados.getAllValues()).extracting(Evento::getIdEvento).containsExactly(7, 8);
	}

	private Evento sesion(int id, EstadoEvento estado) {
		return Evento.builder().idEvento(id).nombre("Sesión " + id).fechaInicio(LocalDate.of(2026, 11, id))
				.horaInicio(LocalTime.of(19, 15))
				.duracion(90).direccion("Hangar 7").estado(estado).aforoMaximo(60).minimoAsistencia(10)
				.precio(new BigDecimal("35.00")).tipoEvento(cata).build();
	}

	private static Reserva reserva(int plazas) {
		return Reserva.builder().cantidad(plazas).build();
	}

	@Test
	void theCloseEndsTheSessionsThatAlreadyFinishedInMadrid() {
		Evento ayer = sesionALas(LocalDate.of(2026, 10, 13), LocalTime.of(19, 15), 90);
		Evento estaManana = sesionALas(LocalDate.of(2026, 10, 14), LocalTime.of(10, 0), 90);
		Evento enCurso = sesionALas(LocalDate.of(2026, 10, 14), LocalTime.of(11, 0), 120);
		when(eventos.findByEstadoAndFechaInicioLessThanEqual(EstadoEvento.ACTIVO, LocalDate.of(2026, 10, 14)))
				.thenReturn(List.of(ayer, estaManana, enCurso));

		assertThat(new EventoServiceImpl(eventos, reservas, HOY).terminarCelebradas()).isEqualTo(2);
		assertThat(List.of(ayer, estaManana, enCurso)).extracting(Evento::getEstado)
				.containsExactly(EstadoEvento.TERMINADO, EstadoEvento.TERMINADO, EstadoEvento.ACTIVO);
	}

	@Test
	void aSessionStartsAtItsTimeAndNotAtMidnight() {
		EventoServiceImpl servicio = new EventoServiceImpl(eventos, reservas, HOY);

		assertThat(servicio.haEmpezado(sesionALas(LocalDate.of(2026, 10, 14), LocalTime.of(11, 59), 60))).isTrue();
		assertThat(servicio.haEmpezado(sesionALas(LocalDate.of(2026, 10, 14), LocalTime.of(19, 15), 60))).isFalse();
	}

	@Test
	void aNewSessionCannotStartEarlierToday() throws Exception {
		when(tipos.findById(1)).thenReturn(Optional.of(cata));
		when(eventos.save(any())).thenAnswer(llamada -> {
			Evento evento = llamada.getArgument(0);
			evento.setIdEvento(9);
			return evento;
		});

		mvc.perform(post("/api/admin/eventos").contentType(MediaType.APPLICATION_JSON)
				.content(formulario(40, "2026-10-14").replace("19:15", "11:00")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.horaInicio").value("Esa hora de hoy ya ha pasado"));
		mvc.perform(post("/api/admin/eventos").contentType(MediaType.APPLICATION_JSON)
				.content(formulario(40, "2026-10-14")))
				.andExpect(status().isCreated());
	}

	@Test
	void aSessionThatAlreadyStartedTakesNoMoreBookings() {
		Evento enCurso = sesionALas(LocalDate.of(2026, 10, 14), LocalTime.of(11, 0), 120);
		enCurso.setIdEvento(3);
		enCurso.setAforoMaximo(40);
		when(eventos.findById(3)).thenReturn(Optional.of(enCurso));
		ReservaServiceImpl servicio = new ReservaServiceImpl(reservas, new EventoServiceImpl(eventos, reservas, HOY),
				mock(UsuarioService.class));

		assertThatThrownBy(() -> servicio.reservarEvento(3, "ana", 1, null))
				.isInstanceOf(ConflictoNegocioException.class)
				.hasMessage("Esta sesión ya ha empezado: no admite más reservas");
		verify(reservas, never()).save(any());
	}

	private Evento sesionALas(LocalDate fecha, LocalTime hora, int minutos) {
		return Evento.builder().fechaInicio(fecha).horaInicio(hora).duracion(minutos).estado(EstadoEvento.ACTIVO)
				.build();
	}

	@Test
	void aNewSessionCannotBeDatedInThePast() throws Exception {
		when(tipos.findById(1)).thenReturn(Optional.of(cata));

		mvc.perform(post("/api/admin/eventos").contentType(MediaType.APPLICATION_JSON)
				.content(formulario(40, "2026-10-13")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.fechaInicio").value("Esa fecha ya ha pasado"));
		verify(eventos, never()).save(any());
	}

	@Test
	void aPastSessionKeepsItsDateWhenEditedButCannotMoveToAnotherPastOne() throws Exception {
		Evento celebrada = sesion(5, EstadoEvento.TERMINADO);
		celebrada.setFechaInicio(LocalDate.of(2026, 6, 1));
		when(eventos.findById(5)).thenReturn(Optional.of(celebrada));
		when(tipos.findById(1)).thenReturn(Optional.of(cata));
		when(eventos.save(any())).thenAnswer(call -> call.getArgument(0));

		mvc.perform(put("/api/admin/eventos/5").contentType(MediaType.APPLICATION_JSON)
				.content(formulario(40, "2026-06-01")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.estado").value("TERMINADO"));
		mvc.perform(put("/api/admin/eventos/5").contentType(MediaType.APPLICATION_JSON)
				.content(formulario(40, "2026-06-02")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.fechaInicio").value("Esa fecha ya ha pasado"));
	}

	@Test
	void aCancelledSessionWhoseDatePassedCannotBeReactivated() throws Exception {
		Evento pasada = sesion(6, EstadoEvento.CANCELADO);
		pasada.setFechaInicio(LocalDate.of(2026, 10, 13));
		when(eventos.findById(6)).thenReturn(Optional.of(pasada));

		mvc.perform(patch("/api/admin/eventos/6/reactivar"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Su fecha ya pasó: cámbiala antes de reactivarla"));
		verify(eventos, never()).save(any());
	}

	private static String formulario(int aforo) {
		return formulario(aforo, "2026-11-20");
	}

	private static String formulario(int aforo, String fecha) {
		return """
				{"nombre": "  Cata de Leche Abducida ", "descripcion": "", "fechaInicio": "%s", "horaInicio": "19:15",
				 "duracion": 120, "direccion": "Hangar 7", "aforoMaximo": %d, "minimoAsistencia": 10,
				 "precio": 35.5, "idTipo": 1}
				""".formatted(fecha, aforo);
	}

	private static OcupacionEvento ocupacion(int idEvento, long plazas, long numero) {
		return new OcupacionEvento() {
			@Override
			public Integer getIdEvento() {
				return idEvento;
			}

			@Override
			public Long getPlazas() {
				return plazas;
			}

			@Override
			public Long getReservas() {
				return numero;
			}
		};
	}
}
