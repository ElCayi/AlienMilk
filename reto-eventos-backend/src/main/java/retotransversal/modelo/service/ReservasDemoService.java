package retotransversal.modelo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.entities.EstadoEvento;
import retotransversal.modelo.entities.Evento;
import retotransversal.modelo.entities.Reserva;
import retotransversal.modelo.entities.Usuario;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.ReservaRepository;
import retotransversal.modelo.repository.UsuarioRepository;

/**
 * El botón «Añadir reservas demo» del panel: reparte unas cuantas reservas entre las cuentas de cliente
 * y las sesiones que aún admiten reservas, sin tocar lo que ya hay. Con solo dos clientes de fábrica no
 * se ve cómo sería un panel con muchas, así que, si faltan, da de alta antes algunas cuentas de cliente
 * de demostración (contraseña 1234). «Restaurar demo» se lo lleva todo.
 *
 * Cada reserva pasa por ReservaService#reservarEvento, con sus reglas de siempre; aquí solo se eligen
 * combinaciones que las cumplen (plazas libres, diez por persona y sesión, cierre antes de empezar).
 */
@Service
@RequiredArgsConstructor
public class ReservasDemoService {

	/** Cuántas reservas añade cada pulsación, como mucho. */
	static final int POR_VEZ = 6;

	/** Cuentas de cliente que debe haber, contando las de fábrica, antes de repartir reservas. */
	static final int CLIENTES_MINIMOS = 8;

	private static final int MAX_POR_PERSONA = 10;

	/** Las cuentas de demostración: usuario, nombre y apellidos. */
	private static final List<String[]> CLIENTES_DEMO = List.of(
			new String[] { "demo.okafor", "Amara", "Okafor" },
			new String[] { "demo.lindqvist", "Sven", "Lindqvist" },
			new String[] { "demo.tanaka", "Hiro", "Tanaka" },
			new String[] { "demo.moreau", "Élise", "Moreau" },
			new String[] { "demo.quispe", "Rosa", "Quispe" },
			new String[] { "demo.haddad", "Karim", "Haddad" },
			new String[] { "demo.nowak", "Ewa", "Nowak" },
			new String[] { "demo.oyelaran", "Tunde", "Oyelaran" });

	/** Lo que la gente suele anotar al reservar; una de cada dos va sin nada. */
	private static final List<String> OBSERVACIONES = List.of(
			"Intolerancia a la lactosa terrestre",
			"Venimos desde el intercambiador norte",
			"Preferimos asientos cerca de la salida",
			"Primera sesión: no sabemos qué esperar",
			"Una de las plazas es para un organismo acompañante");

	private final EventoRepository eventoRepository;
	private final ReservaRepository reservaRepository;
	private final UsuarioRepository usuarioRepository;
	private final UsuarioService usuarioService;
	private final PerfilService perfilService;
	private final EventoService eventoService;
	private final ReservaService reservaService;

	/** Añade hasta {@link #POR_VEZ} reservas y devuelve las creadas. Todo o nada. */
	@Transactional
	public List<Reserva> anadir() {
		List<Usuario> clientes = clientes();
		List<Evento> sesiones = eventoRepository.findByEstado(EstadoEvento.ACTIVO).stream()
				.filter(eventoService::admiteReservas)
				.sorted(Comparator.comparing(Evento::inicio))
				.toList();

		// Lo que ya hay: plazas por sesión y plazas de cada persona en cada sesión.
		Map<Integer, Integer> ocupadas = new HashMap<>();
		Map<String, Integer> dePersona = new HashMap<>();
		for (Reserva reserva : reservaRepository.findAll()) {
			ocupadas.merge(reserva.getEvento().getIdEvento(), reserva.getCantidad(), Integer::sum);
			dePersona.merge(clave(reserva.getUsuario().getUsername(), reserva.getEvento().getIdEvento()),
					reserva.getCantidad(), Integer::sum);
		}

		List<Reserva> creadas = new ArrayList<>();
		int vuelta = (int) reservaRepository.count();
		// Las sesiones con menos reservas primero; cada reserva, de otra persona y en otra sesión. Las
		// parejas ya usadas se saltan, así que dar dos vueltas basta para recorrerlas todas.
		List<Evento> porOcupacion = sesiones.stream()
				.sorted(Comparator.comparingInt((Evento sesion) -> ocupadas.getOrDefault(sesion.getIdEvento(), 0)))
				.toList();
		int parejas = porOcupacion.size() * clientes.size();
		for (int i = 0; creadas.size() < POR_VEZ && i < 2 * parejas; i++) {
			Evento sesion = porOcupacion.get((i + i / clientes.size()) % porOcupacion.size());
			Usuario cliente = clientes.get((i + vuelta) % clientes.size());
			String clave = clave(cliente.getUsername(), sesion.getIdEvento());
			if (dePersona.containsKey(clave)) {
				continue;
			}
			int libres = sesion.getAforoMaximo() - ocupadas.getOrDefault(sesion.getIdEvento(), 0);
			int plazas = Math.min(1 + (vuelta + i) % 3, Math.min(libres, MAX_POR_PERSONA));
			if (plazas < 1) {
				continue;
			}
			String observaciones = (vuelta + i) % 2 == 0 ? OBSERVACIONES.get((vuelta + i) / 2 % OBSERVACIONES.size()) : null;
			creadas.add(reservaService.reservarEvento(sesion.getIdEvento(), cliente.getUsername(), plazas, observaciones));
			ocupadas.merge(sesion.getIdEvento(), plazas, Integer::sum);
			dePersona.put(clave, plazas);
		}
		return creadas;
	}

	/** Las cuentas de cliente activas, dando de alta las de demostración que hagan falta. */
	private List<Usuario> clientes() {
		List<Usuario> clientes = new ArrayList<>(usuarioService.findByPerfilNombre("ROLE_CLIENTE").stream()
				.filter(usuario -> Integer.valueOf(1).equals(usuario.getEnabled()))
				.toList());
		for (String[] demo : CLIENTES_DEMO) {
			if (clientes.size() >= CLIENTES_MINIMOS) {
				break;
			}
			if (usuarioRepository.existsById(demo[0])) {
				continue;
			}
			clientes.add(usuarioService.insertOne(Usuario.builder()
					.username(demo[0])
					.password("1234")
					.email(demo[0] + "@alienmilk.demo")
					.nombre(demo[1])
					.apellidos(demo[2])
					.enabled(1)
					.perfil(perfilService.findByNombre("ROLE_CLIENTE"))
					.build()));
		}
		clientes.sort(Comparator.comparing(Usuario::getUsername));
		return clientes;
	}

	private static String clave(String username, Integer idEvento) {
		return username + "#" + idEvento;
	}
}
