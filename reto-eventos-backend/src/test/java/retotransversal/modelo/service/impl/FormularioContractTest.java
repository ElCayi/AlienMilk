package retotransversal.modelo.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.Solicitud;
import retotransversal.modelo.formularios.CatalogoFormularios;
import retotransversal.modelo.repository.SolicitudRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.restcontroller.FormularioRestController;

class FormularioContractTest {

	private static final String VALIDA = """
			{"valores": {"nombre": "Ana", "email": "ana@example.invalid", "fecha": "2026-11-20",
			             "linea": "N · Servicio nocturno", "pasajeros": 2},
			 "aceptaPrivacidad": true}
			""";

	private final SolicitudRepository repository = mock(SolicitudRepository.class);
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		AtomicInteger ids = new AtomicInteger(42);
		when(repository.save(any())).thenAnswer(call -> {
			Solicitud solicitud = call.getArgument(0);
			if (solicitud.getIdSolicitud() == null) {
				solicitud.setIdSolicitud(ids.getAndIncrement());
			}
			return solicitud;
		});
		ObjectMapper json = new ObjectMapper().findAndRegisterModules();
		Clock reloj = Clock.fixed(Instant.parse("2026-10-07T10:00:00Z"), ZoneId.of("Europe/Madrid"));
		SolicitudServiceImpl service = new SolicitudServiceImpl(new CatalogoFormularios(json), repository,
				new LimitadorSolicitudes(), mock(ApplicationEventPublisher.class), json, reloj);
		mvc = MockMvcBuilders.standaloneSetup(new FormularioRestController(service))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void servesTheDefinitionTheFrontendPaints() throws Exception {
		mvc.perform(get("/api/formularios/operador-am-transit"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.organizacion").value("AM Transit"))
				.andExpect(jsonPath("$.campos[0].clave").value("nombre"))
				.andExpect(jsonPath("$.campos[2].tipo").value("fecha"));
	}

	@Test
	void storesAValidRequestAndReturnsItsReceipt() throws Exception {
		enviar("operador-am-transit", VALIDA)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.referencia").value("AMT-2026-0042"))
				.andExpect(jsonPath("$.organizacion").value("AM Transit"));
	}

	@Test
	void answersWithOneMessagePerInvalidField() throws Exception {
		enviar("operador-am-transit", """
				{"valores": {"nombre": "Ana", "email": "ana", "pasajeros": 40}}
				""")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.email").value("Escriba un correo válido"))
				.andExpect(jsonPath("$.errores.pasajeros").value("El máximo es 12"))
				.andExpect(jsonPath("$.errores.fecha").value("Este campo es obligatorio"))
				.andExpect(jsonPath("$.errores.aceptaPrivacidad").exists());
		verify(repository, never()).save(any());
	}

	@Test
	void answersNotFoundForAnUnknownForm() throws Exception {
		enviar("no-existe", VALIDA).andExpect(status().isNotFound());
	}

	@Test
	void pretendsToAcceptButDiscardsRequestsThatFillTheTrapField() throws Exception {
		enviar("operador-am-transit", VALIDA.replace("\"aceptaPrivacidad\": true", "\"web\": \"spam.example\""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.referencia").exists());
		verify(repository, never()).save(any());
	}

	@Test
	void slowsDownRepeatedRequestsFromTheSameOrigin() throws Exception {
		for (int i = 0; i < 5; i++) {
			enviar("operador-am-transit", VALIDA).andExpect(status().isCreated());
		}
		enviar("operador-am-transit", VALIDA).andExpect(status().isTooManyRequests());
	}

	private ResultActions enviar(String clave, String cuerpo) throws Exception {
		return mvc.perform(post("/api/formularios/{clave}/solicitudes", clave)
				.contentType(MediaType.APPLICATION_JSON).content(cuerpo));
	}
}
