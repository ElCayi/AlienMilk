package retotransversal.modelo.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.repository.EventoRepository;

/**
 * La foto de cada sesión, subida desde el panel. El archivo va a una carpeta del servidor
 * ({@code sesiones.imagenes.directorio}) con un nombre nuevo en cada subida, que la sesión guarda en
 * {@code eventos.imagen}: así la dirección cambia con la foto y ninguna caché enseña la anterior.
 * Una sesión sin foto propia sigue con la de la web (ver session.presenter.ts en el frontend).
 */
@Service
public class ImagenSesionService {

	private static final Logger log = LoggerFactory.getLogger(ImagenSesionService.class);

	public static final long TAMANO_MAXIMO = 5L * 1024 * 1024;

	/** Formatos admitidos, reconocidos por sus primeros bytes y no por lo que diga el navegador. */
	private enum Formato {
		JPEG("jpg", MediaType.IMAGE_JPEG),
		PNG("png", MediaType.IMAGE_PNG),
		WEBP("webp", MediaType.parseMediaType("image/webp"));

		final String extension;
		final MediaType tipo;

		Formato(String extension, MediaType tipo) {
			this.extension = extension;
			this.tipo = tipo;
		}

		static Formato de(byte[] cabecera) {
			if (empieza(cabecera, 0, "ffd8ff")) {
				return JPEG;
			}
			if (empieza(cabecera, 0, "89504e470d0a1a0a")) {
				return PNG;
			}
			if (empieza(cabecera, 0, "52494646") && empieza(cabecera, 8, "57454250")) {
				return WEBP;
			}
			return null;
		}

		static Formato porExtension(String archivo) {
			String extension = archivo.substring(archivo.lastIndexOf('.') + 1);
			return Arrays.stream(values()).filter(f -> f.extension.equals(extension)).findFirst().orElse(JPEG);
		}

		private static boolean empieza(byte[] datos, int desde, String hex) {
			byte[] firma = HexFormat.of().parseHex(hex);
			return datos.length >= desde + firma.length
					&& Arrays.equals(datos, desde, desde + firma.length, firma, 0, firma.length);
		}
	}

	/** Una foto lista para servir. */
	public record Foto(Resource archivo, MediaType tipo) {
	}

	private final EventoRepository eventoRepository;
	private final Path carpeta;

	public ImagenSesionService(EventoRepository eventoRepository,
			@Value("${sesiones.imagenes.directorio:datos/imagenes-sesiones}") String carpeta) {
		this.eventoRepository = eventoRepository;
		this.carpeta = Path.of(carpeta).toAbsolutePath().normalize();
	}

	@Transactional
	public Evento guardar(Integer idEvento, MultipartFile archivo) {
		Evento evento = evento(idEvento);
		if (archivo == null || archivo.isEmpty()) {
			throw new ConflictoNegocioException("Elige una foto");
		}
		if (archivo.getSize() > TAMANO_MAXIMO) {
			throw new ConflictoNegocioException("La foto pesa demasiado: como máximo 5 MB");
		}
		byte[] cabecera;
		try (InputStream entrada = archivo.getInputStream()) {
			cabecera = entrada.readNBytes(16);
		} catch (IOException e) {
			throw new ConflictoNegocioException("No se ha podido leer la foto");
		}
		Formato formato = Formato.de(cabecera);
		if (formato == null) {
			throw new ConflictoNegocioException("La foto tiene que ser JPG, PNG o WebP");
		}

		String nombre = "sesion-%d-%s.%s".formatted(idEvento, UUID.randomUUID().toString().substring(0, 8),
				formato.extension);
		try (InputStream entrada = archivo.getInputStream()) {
			Files.createDirectories(carpeta);
			Files.copy(entrada, carpeta.resolve(nombre), StandardCopyOption.REPLACE_EXISTING);
		} catch (IOException e) {
			log.error("No se ha podido guardar la foto de la sesión {}", idEvento, e);
			throw new IllegalStateException("No se ha podido guardar la foto", e);
		}

		String anterior = evento.getImagen();
		evento.setImagen(nombre);
		Evento guardado = eventoRepository.save(evento);
		borrarArchivo(anterior);
		return guardado;
	}

	/** Quita la foto propia: la sesión vuelve a la de la web. */
	@Transactional
	public Evento quitar(Integer idEvento) {
		Evento evento = evento(idEvento);
		String anterior = evento.getImagen();
		evento.setImagen(null);
		Evento guardado = eventoRepository.save(evento);
		borrarArchivo(anterior);
		return guardado;
	}

	public Foto leer(Integer idEvento) {
		String nombre = evento(idEvento).getImagen();
		Path ruta = nombre == null ? null : carpeta.resolve(nombre);
		if (ruta == null || !Files.isRegularFile(ruta)) {
			throw new RecursoNoEncontradoException("Esta sesión no tiene foto propia");
		}
		return new Foto(new FileSystemResource(ruta), Formato.porExtension(nombre).tipo);
	}

	/** Al borrar una sesión, su foto se va con ella. */
	public void borrarArchivo(String nombre) {
		if (nombre == null || nombre.contains("/") || nombre.contains("\\")) {
			return;
		}
		try {
			Files.deleteIfExists(carpeta.resolve(nombre));
		} catch (IOException e) {
			log.warn("No se ha podido borrar la foto {}", nombre, e);
		}
	}

	/** Vacía la carpeta de fotos (para volver al estado de fábrica). */
	public void borrarTodas() {
		if (!Files.isDirectory(carpeta)) {
			return;
		}
		try (DirectoryStream<Path> archivos = Files.newDirectoryStream(carpeta, "sesion-*")) {
			for (Path archivo : archivos) {
				Files.deleteIfExists(archivo);
			}
		} catch (IOException e) {
			log.warn("No se han podido borrar todas las fotos de sesiones", e);
		}
	}

	private Evento evento(Integer idEvento) {
		return eventoRepository.findById(idEvento)
				.orElseThrow(() -> new RecursoNoEncontradoException("Evento no encontrado"));
	}
}
