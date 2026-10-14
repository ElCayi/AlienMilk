package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import retotransversal.exception.GlobalExceptionHandler;
import retotransversal.modelo.dto.ExpedientesDto;
import retotransversal.modelo.entities.Expediente;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ExpedienteRepository;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.restcontroller.AdminExpedienteRestController;

/** El expediente de las sesiones: capas limpias al guardar, vacías fuera, y la lectura por capas. */
class ExpedientesTest {

	private final ExpedienteRepository expedientes = mock(ExpedienteRepository.class);
	private final TipoEventoRepository tipos = mock(TipoEventoRepository.class);
	private final EventoRepository eventos = mock(EventoRepository.class);
	private final ExpedienteServiceImpl servicio = new ExpedienteServiceImpl(expedientes, tipos, eventos);

	private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AdminExpedienteRestController(servicio))
			.setControllerAdvice(new GlobalExceptionHandler()).build();

	@Test
	void aSessionLayerIsSavedCleanWithoutEmptyRows() throws Exception {
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
				.andExpect(jsonPath("$.preguntas.length()").value(0))
				.andExpect(jsonPath("$.programa").doesNotExist());

		ArgumentCaptor<Expediente> guardado = ArgumentCaptor.forClass(Expediente.class);
		verify(expedientes).save(guardado.capture());
		assertThat(guardado.getValue().getClave()).isEqualTo("SESION:7");
		assertThat(guardado.getValue().getContenido())
				.isEqualTo("{\"entradilla\":\"Una cata\",\"texto\":[\"Primero\"],"
						+ "\"notasCata\":[{\"etiqueta\":\"Nariz\",\"valor\":\"Lunar\"}],\"preguntas\":[]}");
	}

	@Test
	void anEmptyLayerIsDeletedSoEverythingIsInheritedAgain() throws Exception {
		when(tipos.existsById(2)).thenReturn(true);

		mvc.perform(put("/api/admin/expedientes/tipos/2").contentType(MediaType.APPLICATION_JSON)
				.content("{\"entradilla\": \"  \", \"texto\": null}"))
				.andExpect(status().isOk());
		verify(expedientes).deleteById("TIPO:2");
		verify(expedientes, never()).save(any());
	}

	@Test
	void incompleteRowsAreReportedPerSection() throws Exception {
		when(eventos.existsById(7)).thenReturn(true);

		mvc.perform(put("/api/admin/expedientes/sesiones/7").contentType(MediaType.APPLICATION_JSON).content("""
				{"programa": [{"hora": "20:00"}], "preguntas": [{"pregunta": "¿Y si llueve?"}]}
				"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errores.programa").exists())
				.andExpect(jsonPath("$.errores.preguntas").exists());
		verify(expedientes, never()).save(any());
	}

	@Test
	void aSessionThatDoesNotExistHasNoLayer() throws Exception {
		mvc.perform(put("/api/admin/expedientes/sesiones/99").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isNotFound());
	}

	@Test
	void theLayersAreReadByTypeNameAndSessionId() {
		when(tipos.findAll()).thenReturn(List.of(TipoEvento.builder().idTipo(3).nombre("CATA_COSMICA").build()));
		when(expedientes.findAll()).thenReturn(List.of(
				new Expediente("GENERAL", "{\"horario\":\"Hora de la estación\"}"),
				new Expediente("TIPO:3", "{\"procedencia\":\"Orión\"}"),
				new Expediente("TIPO:8", "{\"procedencia\":\"Huérfana\"}"),
				new Expediente("SESION:5", "{\"entradilla\":\"Eclipse\"}")));

		ExpedientesDto todas = servicio.todas();

		assertThat(todas.general().horario()).isEqualTo("Hora de la estación");
		assertThat(todas.porTipo()).containsOnlyKeys("CATA_COSMICA");
		assertThat(todas.porTipo().get("CATA_COSMICA").procedencia()).isEqualTo("Orión");
		assertThat(todas.porSesion().get("5").entradilla()).isEqualTo("Eclipse");
		verify(expedientes, never()).deleteById(anyString());
	}
}
