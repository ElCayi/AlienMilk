package retotransversal.modelo.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import retotransversal.exception.DemasiadasSolicitudesException;

/**
 * Freno sencillo contra el envío masivo de formularios públicos: unas pocas solicitudes por origen
 * cada cuarto de hora y un tope global por hora. Vive en memoria, así que se reinicia con el backend;
 * para un proyecto de este tamaño basta.
 */
@Component
public class LimitadorSolicitudes {

	static final int POR_ORIGEN = 5;
	static final Duration VENTANA_ORIGEN = Duration.ofMinutes(15);
	static final int GLOBAL = 60;
	static final Duration VENTANA_GLOBAL = Duration.ofHours(1);

	private final Clock reloj;
	private final Map<String, Deque<Instant>> porOrigen = new HashMap<>();
	private final Deque<Instant> global = new ArrayDeque<>();

	@Autowired
	public LimitadorSolicitudes() {
		this(Clock.systemUTC());
	}

	LimitadorSolicitudes(Clock reloj) {
		this.reloj = reloj;
	}

	/** Anota una solicitud desde `origen`, o la rechaza si ya se ha alcanzado algún límite. */
	public synchronized void registrar(String origen) {
		Instant ahora = reloj.instant();
		porOrigen.values().removeIf(lista -> {
			descartarAnteriores(lista, ahora.minus(VENTANA_ORIGEN));
			return lista.isEmpty();
		});
		descartarAnteriores(global, ahora.minus(VENTANA_GLOBAL));
		Deque<Instant> envios = porOrigen.computeIfAbsent(origen, clave -> new ArrayDeque<>());

		if (envios.size() >= POR_ORIGEN) {
			throw new DemasiadasSolicitudesException(
					"Ha enviado varias solicitudes seguidas. Inténtelo de nuevo dentro de unos minutos.");
		}
		if (global.size() >= GLOBAL) {
			throw new DemasiadasSolicitudesException(
					"Ahora mismo recibimos demasiadas solicitudes. Inténtelo de nuevo más tarde.");
		}
		envios.addLast(ahora);
		global.addLast(ahora);
	}

	private static void descartarAnteriores(Deque<Instant> envios, Instant limite) {
		while (!envios.isEmpty() && envios.peekFirst().isBefore(limite)) {
			envios.removeFirst();
		}
	}
}
