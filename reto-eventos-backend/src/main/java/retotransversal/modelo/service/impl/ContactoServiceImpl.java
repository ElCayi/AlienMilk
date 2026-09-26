package retotransversal.modelo.service.impl;

import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.dto.ContactoPayloadDto;
import retotransversal.modelo.entities.Contacto;
import retotransversal.modelo.repository.ContactoRepository;
import retotransversal.modelo.service.ContactoService;

@Service
@RequiredArgsConstructor
public class ContactoServiceImpl implements ContactoService {

	private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
	private static final Pattern TELEFONO = Pattern.compile("^\\+?[0-9 ()-]{6,30}$");

	private final ContactoRepository contactoRepository;

	@Override
	public Contacto obtener() {
		return contactoRepository.findById(Contacto.ID_FICHA)
				.orElseThrow(() -> new RecursoNoEncontradoException("La ficha de contacto no está configurada"));
	}

	@Override
	@Transactional
	public Contacto actualizar(ContactoPayloadDto datos, String username) {
		Contacto contacto = obtener();

		contacto.setNombreSede(requerido(datos.getNombreSede(), "El nombre de la sede", 80));
		contacto.setDireccion(requerido(datos.getDireccion(), "La dirección", 120));
		contacto.setCiudad(requerido(datos.getCiudad(), "La ciudad", 80));
		contacto.setEmail(email(datos.getEmail()));
		contacto.setTelefono(telefono(datos.getTelefono()));
		contacto.setDiasApertura(dias(datos.getDiasApertura()));
		if (datos.getHoraApertura() == null || datos.getHoraCierre() == null) {
			throw new IllegalArgumentException("Indica la hora de apertura y la de cierre");
		}
		if (datos.getHoraApertura().equals(datos.getHoraCierre())) {
			throw new IllegalArgumentException("La hora de apertura y la de cierre no pueden coincidir");
		}
		contacto.setHoraApertura(datos.getHoraApertura());
		contacto.setHoraCierre(datos.getHoraCierre());
		contacto.setZonaHoraria(zona(datos.getZonaHoraria()));
		contacto.setComoLlegar(opcional(datos.getComoLlegar(), "El texto de cómo llegar", 300));
		contacto.setCondicionesAcceso(opcional(datos.getCondicionesAcceso(), "Las condiciones de acceso", 300));
		contacto.setActualizadoEn(LocalDateTime.now());
		contacto.setActualizadoPor(username);

		return contactoRepository.save(contacto);
	}

	private static String requerido(String valor, String campo, int maximo) {
		String limpio = opcional(valor, campo, maximo);
		if (limpio == null) {
			throw new IllegalArgumentException(campo + " es obligatorio");
		}
		return limpio;
	}

	private static String opcional(String valor, String campo, int maximo) {
		if (valor == null || valor.isBlank()) {
			return null;
		}
		String limpio = valor.strip();
		if (limpio.length() > maximo) {
			throw new IllegalArgumentException(campo + " admite como máximo " + maximo + " caracteres");
		}
		return limpio;
	}

	private static String email(String valor) {
		String limpio = requerido(valor, "El correo", 100);
		if (!EMAIL.matcher(limpio).matches()) {
			throw new IllegalArgumentException("El correo no tiene un formato válido");
		}
		return limpio;
	}

	private static String telefono(String valor) {
		String limpio = opcional(valor, "El teléfono", 30);
		if (limpio != null && !TELEFONO.matcher(limpio).matches()) {
			throw new IllegalArgumentException("El teléfono solo admite números, espacios, guiones, paréntesis y +");
		}
		return limpio;
	}

	private static String dias(List<Integer> dias) {
		if (dias == null || dias.isEmpty()) {
			throw new IllegalArgumentException("Selecciona al menos un día de apertura");
		}
		if (dias.stream().anyMatch(dia -> dia == null || dia < 1 || dia > 7)) {
			throw new IllegalArgumentException("Los días de apertura van del 1 (lunes) al 7 (domingo)");
		}
		return dias.stream().distinct().sorted().map(String::valueOf).collect(Collectors.joining(","));
	}

	private static String zona(String valor) {
		String limpio = requerido(valor, "La zona horaria", 40);
		try {
			return ZoneId.of(limpio).getId();
		} catch (DateTimeException ex) {
			throw new IllegalArgumentException("Zona horaria desconocida: " + limpio);
		}
	}
}
