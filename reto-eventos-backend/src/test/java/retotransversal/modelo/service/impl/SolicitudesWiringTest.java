package retotransversal.modelo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.fasterxml.jackson.databind.ObjectMapper;

import retotransversal.modelo.formularios.CatalogoFormularios;
import retotransversal.modelo.repository.SolicitudRepository;
import retotransversal.modelo.service.LimitadorSolicitudes;
import retotransversal.modelo.service.SolicitudService;

/**
 * Las clases de las solicitudes tienen un constructor para Spring y otro para los tests: comprueba
 * que Spring sabe con cuál crearlas. ApplicationTests necesita una base de datos y no siempre la hay.
 */
class SolicitudesWiringTest {

	@Test
	void springBuildsTheRequestBeansWithTheirProductionConstructors() {
		new ApplicationContextRunner()
				.withBean(ObjectMapper.class)
				.withBean(SolicitudRepository.class, () -> mock(SolicitudRepository.class))
				.withBean(CatalogoFormularios.class)
				.withBean(LimitadorSolicitudes.class)
				.withBean(SolicitudServiceImpl.class)
				.run(context -> {
					assertThat(context).hasNotFailed();
					assertThat(context.getBean(SolicitudService.class).definicion("operador-kepler-liaison").prefijo())
							.isEqualTo("KL");
				});
	}
}
