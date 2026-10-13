import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, EstadoEvento } from '../../models/api.models';

/** El tono de una pastilla de estado: en marcha, pide atención o cerrado. */
export type Tone = 'ok' | 'alert' | 'off';

export const SESSION_STATES: Record<EstadoEvento, { label: string; tone: Tone }> = {
  ACTIVO: { label: 'Activa', tone: 'ok' },
  CANCELADO: { label: 'Cancelada', tone: 'alert' },
  TERMINADO: { label: 'Terminada', tone: 'off' },
};

/** Una reserva según cómo está su sesión. */
export const RESERVATION_STATES: Record<EstadoEvento, { label: string; tone: Tone }> = {
  ACTIVO: { label: 'Confirmada', tone: 'ok' },
  CANCELADO: { label: 'Sesión cancelada', tone: 'alert' },
  TERMINADO: { label: 'Celebrada', tone: 'off' },
};

export function sessionState(estado: string): { label: string; tone: Tone } {
  return SESSION_STATES[estado as EstadoEvento] ?? { label: estado, tone: 'off' };
}

export function reservationState(estadoEvento: string): { label: string; tone: Tone } {
  return RESERVATION_STATES[estadoEvento as EstadoEvento] ?? { label: estadoEvento, tone: 'off' };
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

const DAY = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const DAY_TIME = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
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

export function formatDayTime(isoDateTime: string | null | undefined): string {
  return isoDateTime ? DAY_TIME.format(new Date(isoDateTime)) : '—';
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
