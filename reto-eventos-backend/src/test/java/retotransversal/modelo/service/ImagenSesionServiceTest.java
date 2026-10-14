package retotransversal.modelo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.repository.EventoRepository;

/** Fotos de las sesiones: se reconocen por su contenido, cada subida estrena nombre y la anterior se borra. */
class ImagenSesionServiceTest {

	private static final byte[] PNG = HexFormat.of().parseHex("89504e470d0a1a0a0000000d49484452");

	@TempDir
	Path carpeta;

	private final EventoRepository eventos = mock(EventoRepository.class);
	private final Evento sesion = Evento.builder().idEvento(7).nombre("Eclipse").build();
	private ImagenSesionService servicio;

	@BeforeEach
	void preparar() {
		servicio = new ImagenSesionService(eventos, carpeta.toString());
		when(eventos.findById(7)).thenReturn(Optional.of(sesion));
		when(eventos.save(any())).thenAnswer(call -> call.getArgument(0));
	}

	@Test
	void aNewPhotoReplacesTheOldOneOnDisk() throws Exception {
		servicio.guardar(7, new MockMultipartFile("archivo", "a.png", "image/png", PNG));
		String primera = sesion.getImagen();
		servicio.guardar(7, new MockMultipartFile("archivo", "b.png", "image/png", PNG));

		assertThat(sesion.getImagen()).startsWith("sesion-7-").endsWith(".png").isNotEqualTo(primera);
		assertThat(Files.exists(carpeta.resolve(primera))).isFalse();
		assertThat(servicio.leer(7).tipo()).isEqualTo(MediaType.IMAGE_PNG);
	}

	@Test
	void aFileThatIsNotAnImageIsRejectedWhateverItsName() {
		assertThatThrownBy(() -> servicio.guardar(7,
				new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", "<script>".getBytes())))
				.isInstanceOf(ConflictoNegocioException.class)
				.hasMessage("La foto tiene que ser JPG, PNG o WebP");
		assertThat(sesion.getImagen()).isNull();
	}

	@Test
	void removingThePhotoGoesBackToTheWebsiteOne() throws Exception {
		servicio.guardar(7, new MockMultipartFile("archivo", "a.png", "image/png", PNG));
		String nombre = sesion.getImagen();

		servicio.quitar(7);

		assertThat(sesion.getImagen()).isNull();
		assertThat(Files.exists(carpeta.resolve(nombre))).isFalse();
	}
}
