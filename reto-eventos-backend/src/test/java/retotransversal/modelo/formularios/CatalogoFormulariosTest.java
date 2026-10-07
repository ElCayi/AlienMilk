package retotransversal.modelo.formularios;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class CatalogoFormulariosTest {

	@Test
	void loadsEveryDefinitionShippedWithTheBackend() {
		CatalogoFormularios catalogo = new CatalogoFormularios(new ObjectMapper());

		assertThat(catalogo.claves()).contains("operador-am-transit", "operador-helix-transfer",
				"operador-kepler-liaison");
		assertThat(catalogo.buscar("operador-am-transit")).get()
				.extracting(FormularioDefinicion::prefijo).isEqualTo("AMT");
	}

	@Test
	void refusesToStartWithADefinitionThatLacksTheEmailField() {
		assertThatThrownBy(() -> new CatalogoFormularios(new ObjectMapper(),
				"classpath:formularios-prueba/sin-email/*.json"))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("email");
	}
}
