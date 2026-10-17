import { HttpErrorResponse } from '@angular/common/http';

import { sessionSchedule } from '../../features/sessions/session.presenter';
import { ApiError, EstadoEvento, Reserva } from '../../models/api.models';

/** El tono de una pastilla de estado: en marcha, pide atención o cerrado. */
/** live: lo que está en marcha (verde); ok: lo normal; alert: lo que pide atención; off: lo cerrado. */
export type Tone = 'live' | 'ok' | 'alert' | 'off';

export const SESSION_STATES: Record<EstadoEvento, { label: string; tone: Tone }> = {
  ACTIVO: { label: 'Activa', tone: 'live' },
  CANCELADO: { label: 'Cancelada', tone: 'alert' },
  TERMINADO: { label: 'Terminada', tone: 'off' },
};

/** Una reserva según cómo está su sesión. */
export const RESERVATION_STATES: Record<EstadoEvento, { label: string; tone: Tone }> = {
  ACTIVO: { label: 'Confirmada', tone: 'live' },
  CANCELADO: { label: 'Sesión cancelada', tone: 'alert' },
  TERMINADO: { label: 'Celebrada', tone: 'off' },
};

export function sessionState(estado: string): { label: string; tone: Tone } {
  return SESSION_STATES[estado as EstadoEvento] ?? { label: estado, tone: 'off' };
}

/** Una reserva: cancelada, si lo está; si no, según cómo está su sesión. */
export function reservationState(reserva: Pick<Reserva, 'estadoEvento' | 'canceladaEn'>): { label: string; tone: Tone } {
  if (reserva.canceladaEn) {
    return { label: 'Cancelada', tone: 'off' };
  }
  return RESERVATION_STATES[reserva.estadoEvento as EstadoEvento] ?? { label: reserva.estadoEvento, tone: 'off' };
}

/**
 * «Cancelada por ti el 09 oct 2026», «Cancelada por AlienMilk el …», «Anulada el …» (por el sistema: un
 * pago que no llegó, una sesión reactivada): quién y cuándo, para la ficha y el historial.
 */
export function cancellationLine(reserva: Reserva, propia = false): string {
  const dia = formatDay(reserva.canceladaEn!.slice(0, 10));
  if (reserva.canceladaPor === 'SISTEMA') {
    return `Anulada el ${dia}`;
  }
  const quien = reserva.canceladaPor === 'CLIENTE' ? (propia ? 'por ti' : 'por el cliente') : 'por AlienMilk';
  return `Cancelada ${quien} el ${dia}`;
}

/** El cobro en una pastilla, solo cuando pide atención: lo pagado es lo normal y no se dice. */
export function paymentBadge(reserva: Reserva): { label: string; tone: Tone } | null {
  if (reserva.canceladaEn) {
    return null;
  }
  switch (reserva.estadoPago) {
    case 'PENDIENTE':
      return { label: 'Pendiente de pago', tone: 'alert' };
    case 'EN_TAQUILLA':
      return { label: 'Pago en taquilla', tone: 'ok' };
    default:
      return null;
  }
}

/** El cobro en una línea, para la ficha: cómo se pagó y lo devuelto, si algo. */
export function paymentLine(reserva: Reserva): string {
  const base = {
    PENDIENTE: reserva.canceladaEn ? 'Sin pagar' : 'Pendiente de pago con tarjeta',
    PAGADA: reserva.pagadaEn ? `Pagada con tarjeta el ${formatDay(reserva.pagadaEn.slice(0, 10))}` : 'Pagada',
    EN_TAQUILLA: reserva.canceladaEn ? 'Sin cobrar' : 'Se paga en taquilla al llegar',
    COBRADA_TAQUILLA: 'Cobrada en taquilla',
  }[reserva.estadoPago];
  const devuelto = Number(reserva.importeDevuelto);
  return devuelto > 0 ? `${base} · devueltos ${formatMoney(devuelto)}` : base;
}

const PROFILE_LABELS: Record<string, string> = {
  ROLE_ADMON: 'Administrador',
  ROLE_CLIENTE: 'Cliente',
};

/** «ROLE_ADMON» → «Administrador»; uno nuevo, «ROLE_EDITOR» → «Editor». */
export function profileLabel(nombre: string): string {
  return PROFILE_LABELS[nombre] ?? humanizeCode(nombre.replace(/^ROLE_/, ''));
}

/** «CATA_COSMICA» → «Cata cosmica»: el mismo nombre que enseña la programación pública. */
export function humanizeCode(code: string): string {
  const words = code.toLowerCase().split('_').filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** El día siempre a dos cifras (05 dic 2026): en columna, las fechas quedan alineadas. */
const DAY = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const DAY_TIME = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const PRICE = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/** Una fecha sin hora («2026-05-20»), tal cual, sin que la zona horaria la mueva de día. */
export function formatDay(isoDate: string | null | undefined): string {
  return isoDate ? DAY.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)) : '—';
}

/** Cuándo es la sesión de una reserva: el día y su horario (20 nov 2026 · 19:15 – 21:45). */
export function reservationWhen(reserva: Reserva): string {
  const schedule = sessionSchedule({ horaInicio: reserva.horaInicioEvento, duracion: reserva.duracionEvento });
  const day = formatDay(reserva.fechaInicioEvento);
  return schedule ? `${day} · ${schedule}` : day;
}

export function formatDayTime(isoDateTime: string | null | undefined): string {
  return isoDateTime ? DAY_TIME.format(new Date(isoDateTime)) : '—';
}

/** La hora de una fecha y hora local del servidor («2026-10-17T18:42:00» → «18:42»). */
export function formatTime(isoDateTime: string): string {
  return isoDateTime.slice(11, 16);
}

export function formatMoney(amount: number | null | undefined): string {
  return amount == null ? '—' : PRICE.format(amount);
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Sin tildes ni mayúsculas, para buscar: «lopez» encuentra «López». */
export function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Todas las palabras buscadas aparecen en alguno de los textos. */
export function matches(query: string, ...texts: (string | null | undefined)[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) {
    return true;
  }
  const haystack = normalize(texts.join(' '));
  return words.every((word) => haystack.includes(word));
}

/** El mensaje del servidor, o el de repuesto si no llegó ninguno (sin conexión, error interno). */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No hay conexión con el servidor. Inténtalo de nuevo en unos minutos.';
    }
    const body = error.error as ApiError | string | null;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object' && body.message && error.status < 500) {
      return body.message;
    }
  }
  return fallback;
}

/** Los errores por campo de una respuesta 400 del servidor (vacío si no los hay). */
export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return (error.error as ApiError).errores ?? {};
  }
  return {};
}
