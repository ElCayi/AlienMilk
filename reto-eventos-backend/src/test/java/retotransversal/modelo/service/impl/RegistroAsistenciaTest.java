package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.service.UsuarioService;
import retotransversal.restcontroller.ReservaRestController;

/** Reservar desde la web: el registro de asistencia completo, y la revisión cuando hay adaptaciones o material. */
class RegistroAsistenciaTest {

	private static final Clock HOY = Clock.fixed(
			LocalDate.of(2026, 10, 16).atTime(12, 0).atZone(ZoneId.of("Europe/Madrid")).toInstant(),
			ZoneId.of("Europe/Madrid"));

	private final EventoRepository eventos = mock(EventoRepository.class);
	private final ReservaRepository reservas = mock(ReservaRepository.class);
	private final UsuarioService usuarios = mock(UsuarioService.class);
	private final Usuario ana = Usuario.builder().username("ana").nombre("Ana").build();

	private final MockMvc mvc = MockMvcBuilders
			.standaloneSetup(new ReservaRestController(
					new ReservaServiceImpl(reservas, new EventoServiceImpl(eventos, reservas, HOY), usuarios)))
			.setControllerAdvice(new GlobalExceptionHandler()).build();

	RegistroAsistenciaTest() {
		// La lectura con bloqueo devuelve lo mismo que la normal: aquí no hay base de datos que bloquear.
		when(eventos.findByIdBloqueando(any())).thenAnswer(llamada -> eventos.findById(llamada.getArgument(0)));
		when(eventos.findById(5)).thenReturn(Optional.of(Evento.builder().idEvento(5).nombre("Eclipse")
				.fechaInicio(LocalDate.of(2026, 12, 27)).horaInicio(LocalTime.of(21, 0)).duracion(170)
				.estado(EstadoEvento.ACTIVO).aforoMaximo(500).precio(new BigDecimal("48.00")).build()));
		when(usuarios.findById("ana")).thenReturn(ana);
		when(reservas.save(any())).thenAnswer(llamada -> llamada.getArgument(0));
	}

	@Test
	void everyMissingPartOfTheRegistryIsReportedAtOnce() throws Exception {
		mvc.perform(reservar("""
				{"cantidad": 2, "asistentes": [{"nombre": " ", "credencial": "CARNET_DE_SOCIO"}],
				 "materialExterno": true}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.asistentes").value("Identifique a los 2 participantes, uno por plaza"))
				.andExpect(jsonPath("$.errores['asistentes.0.nombre']").value("Indique su nombre de identificación"))
				.andExpect(jsonPath("$.errores['asistentes.0.credencial']").value("Elija la credencial que presentará"))
				.andExpect(jsonPath("$.errores.telefono").exists())
				.andExpect(jsonPath("$.errores.materialDescripcion").exists())
				.andExpect(jsonPath("$.errores.aceptaEdad").exists())
				.andExpect(jsonPath("$.errores.aceptaCondiciones").exists());
		verify(reservas, never()).save(any());
	}

	@Test
	void aCompleteRegistryIsSavedAndExternalEquipmentAsksForReview() throws Exception {
		mvc.perform(reservar("""
				{"cantidad": 2, "telefono": "+34 600 123 456",
				 "asistentes": [
				   {"nombre": " Ana Lopez ", "credencial": "DNI_NIE", "procedencia": "Madrid, SOL-III"},
				   {"nombre": "Lhenna Quo", "credencial": "CREDENCIAL_TRANSITO", "procedencia": "Kraken Mare, Titán",
				    "incompatibilidades": "Muestras con actividad residual"}],
				 "materialExterno": true, "materialDescripcion": "Respirador de metano",
				 "aceptaEdad": true, "aceptaCondiciones": true, "aceptaComunicaciones": true}
				"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.asistentes.length()").value(2))
				.andExpect(jsonPath("$.asistentes[0].nombre").value("Ana Lopez"))
				.andExpect(jsonPath("$.asistentes[1].credencial").value("CREDENCIAL_TRANSITO"))
				.andExpect(jsonPath("$.requiereRevision").value(true))
				.andExpect(jsonPath("$.conformidadEn").exists());
		assertThat(ana.isAceptaComunicaciones()).isTrue();
	}

	private static org.springframework.test.web.servlet.RequestBuilder reservar(String cuerpo) {
		return post("/api/reservas/evento/5").principal(new UsernamePasswordAuthenticationToken("ana", null, List.of()))
				.contentType(MediaType.APPLICATION_JSON).content(cuerpo);
	}
}
