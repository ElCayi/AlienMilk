package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Expediente;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ExpedienteRepository;
import retotransversal.restcontroller.AdminExpedienteRestController;

/** El expediente de cada sesión: limpio al guardar, en lote todo o nada, y el reparto de las capas antiguas. */
class ExpedientesTest {

	private final ExpedienteRepository expedientes = mock(ExpedienteRepository.class);
	private final EventoRepository eventos = mock(EventoRepository.class);
	private final ExpedienteServiceImpl servicio = new ExpedienteServiceImpl(expedientes, eventos);

	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AdminExpedienteRestController(servicio))
			.setControllerAdvice(new GlobalExceptionHandler()).build();

	@Test
	void aSessionDossierIsSavedCleanWithoutEmptyRows() throws Exception {
		when(eventos.existsById(7)).thenReturn(true);

		mvc.perform(put("/api/admin/expedientes/sesiones/7").contentType(MediaType.APPLICATION_JSON).content("""
				{"entradilla": "  Una cata  ", "texto": ["Primero", "   "],
				 "notasCata": [{"etiqueta": "Nariz", "valor": "Lunar"}, {"etiqueta": " ", "valor": ""}],
				 "preguntas": []}
				"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.entradilla").value("Una cata"))
				.andExpect(jsonPath("$.texto.length()").value(1))
				.andExpect(jsonPath("$.notasCata.length()").value(1))
				.andExpect(jsonPath("$.programa").doesNotExist());

		ArgumentCaptor<Expediente> guardado = ArgumentCaptor.forClass(Expediente.class);
		verify(expedientes).save(guardado.capture());
		assertThat(guardado.getValue().getClave()).isEqualTo("SESION:7");
		assertThat(guardado.getValue().getContenido())
				.isEqualTo("{\"entradilla\":\"Una cata\",\"texto\":[\"Primero\"],"
						+ "\"notasCata\":[{\"etiqueta\":\"Nariz\",\"valor\":\"Lunar\"}],\"preguntas\":[]}");
	}

	@Test
	void anEmptyDossierIsDeleted() throws Exception {
		when(eventos.existsById(2)).thenReturn(true);

		mvc.perform(put("/api/admin/expedientes/sesiones/2").contentType(MediaType.APPLICATION_JSON)
				.content("{\"entradilla\": \"  \"}"))
				.andExpect(status().isOk());
		verify(expedientes).deleteById("SESION:2");
		verify(expedientes, never()).save(any());
	}

	@Test
	void aBatchIsSavedWholeOrNotAtAllWithEveryErrorTaggedBySession() throws Exception {
		when(eventos.existsById(any())).thenReturn(true);

		mvc.perform(put("/api/admin/expedientes/lote").contentType(MediaType.APPLICATION_JSON).content("""
				{"3": {"horario": "De 19:00 a 21:00"},
				 "5": {"preguntas": [{"pregunta": "¿Y si llueve?"}]},
				 "7": {"programa": [{"hora": "20:00"}]}}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores['5.preguntas']").exists())
				.andExpect(jsonPath("$.errores['7.programa']").exists());
		verify(expedientes, never()).save(any());

		mvc.perform(put("/api/admin/expedientes/lote").contentType(MediaType.APPLICATION_JSON).content("""
				{"3": {"horario": "De 19:00 a 21:00"}, "5": {"horario": "De 19:00 a 21:00"}}
				"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$['5'].horario").value("De 19:00 a 21:00"));
		verify(expedientes, times(2)).save(any());
	}

	@Test
	void theOldLayersAreSpreadIntoEachSessionAndThenRemoved() {
		TipoEvento cata = TipoEvento.builder().idTipo(1).nombre("CATA_COSMICA").build();
		TipoEvento orbita = TipoEvento.builder().idTipo(4).nombre("ORBITA_GUIADA").build();
		when(eventos.findAll()).thenReturn(List.of(
				Evento.builder().idEvento(5).tipoEvento(cata).build(),
				Evento.builder().idEvento(6).tipoEvento(orbita).build()));
		when(expedientes.findAll()).thenReturn(List.of(
				new Expediente("GENERAL", "{\"horario\":\"Hora de la estación\",\"preguntas\":[{\"pregunta\":\"¿Común?\",\"respuesta\":\"Sí\"}]}"),
				new Expediente("TIPO:1", "{\"horario\":\"Noche\",\"notasCata\":[{\"etiqueta\":\"Nariz\",\"valor\":\"Lunar\"}]}"),
				new Expediente("SESION:5", "{\"entradilla\":\"Eclipse\",\"preguntas\":[{\"pregunta\":\"¿Gafas?\",\"respuesta\":\"No\"}]}")));

		assertThat(servicio.aplanarCapasAntiguas()).isEqualTo(2);

		ArgumentCaptor<Expediente> guardados = ArgumentCaptor.forClass(Expediente.class);
		verify(expedientes, times(2)).save(guardados.capture());
		Map<String, String> porClave = guardados.getAllValues().stream()
				.collect(Collectors.toMap(Expediente::getClave, Expediente::getContenido));
		assertThat(porClave.get("SESION:5"))
				.contains("\"entradilla\":\"Eclipse\"", "\"horario\":\"Noche\"", "Nariz", "¿Común?", "¿Gafas?");
		assertThat(porClave.get("SESION:6")).contains("\"horario\":\"Hora de la estación\"", "¿Común?")
				.doesNotContain("Nariz");
		verify(expedientes).deleteAllById(List.of("GENERAL", "TIPO:1"));
	}

	@Test
	void withNoOldLayersLeftNothingIsTouched() {
		when(expedientes.findAll()).thenReturn(List.of(new Expediente("SESION:5", "{\"entradilla\":\"Eclipse\"}")));

		assertThat(servicio.aplanarCapasAntiguas()).isZero();
		verify(expedientes, never()).save(any());
	}
}
