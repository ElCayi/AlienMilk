package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.dto.ReservaCrearDto;
import retotransversal.modelo.dto.ReservaEditarDto;
import retotransversal.modelo.entities.Reserva;

public interface ReservaService extends CrudGenerico<Reserva, Integer> {

	List<Reserva> findByUsuario(String username);

	/** Todas las reservas, de la sesión más reciente a la más antigua, para el panel de administración. */
	List<Reserva> findTodas();

	/** Una reserva sin registro de asistencia: la que se da de alta a mano desde el panel. */
	Reserva reservarEvento(Integer idEvento, String username, Integer cantidad, String observaciones);

	/**
	 * Una reserva desde la web, con su registro de asistencia: un participante por plaza, teléfono,
	 * adaptaciones y material externo si los hay, y la conformidad con la edad y las condiciones.
	 */
	Reserva reservarConRegistro(Integer idEvento, String username, ReservaCrearDto registro);

	/** Lo mismo para las reservas demo del panel: se dan por pagadas, sin pasar por la pasarela. */
	Reserva reservarDemo(Integer idEvento, String username, ReservaCrearDto registro);

	/** En el control de ingreso: un participante registrado entra (o se deshace un error al marcarlo). */
	Reserva marcarEntrada(Integer idReserva, Integer orden, boolean presente);

	/** En el control de ingreso: cuántas plazas de una reserva sin registrar han entrado ya. */
	Reserva contarEntradas(Integer idReserva, int plazas);

	/** La revisión de las adaptaciones y el material: aceptadas o no, con una nota para el cliente. */
	Reserva revisar(Integer idReserva, boolean aceptada, String nota);

	/** Una reserva para pagar en taquilla, ya cobrada. */
	Reserva marcarCobrada(Integer idReserva);

	/** Corrige el teléfono, las observaciones y los participantes; no toca sesión, plazas, precio ni conformidad. */
	Reserva editarReservaAdmin(Integer idReserva, ReservaEditarDto datos);

	/** Lo mismo desde la cuenta del cliente, sin observaciones y hasta el día anterior a la sesión. */
	Reserva editarReservaPropia(Integer idReserva, String username, ReservaEditarDto datos);

	int cancelarReserva(Integer idReserva, String username);

	/** Cancela sin borrar: la reserva libera sus plazas y guarda quién, cuándo y por qué. */
	Reserva cancelarReservaAdmin(Integer idReserva, String motivo, boolean devolver);
}
