package retotransversal.modelo.service;

import java.util.List;

import retotransversal.modelo.dto.EventoAdminDto;
import retotransversal.modelo.entities.Evento;

public interface EventoService extends CrudGenerico<Evento, Integer> {

	List<Evento> findActivos();

	List<Evento> findCancelados();

	List<Evento> findTerminados();

	List<Evento> findActivosPorTipo(Integer idTipo);

	Evento cancelarEvento(Integer idEvento);

	/** Archiva una sesión que ya no está activa, o la saca del archivo. */
	Evento archivar(Integer idEvento, boolean archivada);

	/** Deshace una cancelación: la sesión vuelve a admitir reservas. */
	Evento reactivarEvento(Integer idEvento);

	/** Da por terminadas las sesiones activas cuya fecha ya pasó; devuelve cuántas. */
	int terminarCelebradas();

	/**
	 * La sesión, bloqueada hasta que acabe la transacción en curso: para reservar o cambiar su aforo sin
	 * que otra petición lo haga a la vez (ver EventoRepository#findByIdBloqueando).
	 */
	Evento bloquear(Integer idEvento);

	/** Si la sesión ya ha empezado (su fecha y hora, en Madrid). */
	boolean haEmpezado(Evento evento);

	/**
	 * Si todavía admite reservas: hasta que cierra el control de ingreso, 10
	 * minutos antes de empezar. Lo dice la página de Documentación y las condiciones de acceso.
	 */
	boolean admiteReservas(Evento evento);

	/**
	 * Si todavía admite reservas desde la web, que se pagan con tarjeta: hasta 40 minutos antes, los 30
	 * que Stripe da como mínimo para pagar más los 10 del cierre del control de ingreso. Así nadie paga con
	 * la puerta ya cerrada. Por teléfono o en taquilla, hasta el cierre (ver admiteReservas).
	 */
	boolean admiteReservasOnline(Evento evento);

	/** Si una reserva suya aún se puede cancelar: hasta el día anterior, como dicen sus preguntas frecuentes. */
	boolean admiteCancelaciones(Evento evento);

	/** Todas las sesiones con su ocupación, para el panel de administración. */
	List<EventoAdminDto> listadoAdmin();

	EventoAdminDto aAdminDto(Evento evento);
}
