import { EventoDetalle } from '../../models/api.models';
import { SessionDossier, SessionDossierLayer } from '../../models/session-dossier.models';

const EMPTY_DOSSIER: SessionDossier = {
  entradilla: '',
  texto: [],
  procedencia: 'No declarada',
  horario: '',
  notasCata: [],
  programa: [],
  equipo: [],
  acceso: [],
  recomendaciones: [],
  preguntas: [],
  colaboradores: [],
  creditos: '',
};

/**
 * El expediente completo de una sesión: lo que tenga guardado y, en lo que falte, vacío. Lo que la API
 * ya sabe de la sesión (su descripción) sirve de respaldo para que ningún expediente quede en blanco.
 */
export function buildSessionDossier(
  session: EventoDetalle,
  stored: SessionDossierLayer | null | undefined,
): SessionDossier {
  const dossier: SessionDossier = { ...EMPTY_DOSSIER, ...stripNulls(stored ?? {}) };
  return {
    ...dossier,
    entradilla: dossier.entradilla || session.descripcion,
    texto: dossier.texto.length ? dossier.texto : [session.descripcion].filter(Boolean),
  };
}

function stripNulls(layer: SessionDossierLayer): SessionDossierLayer {
  return Object.fromEntries(Object.entries(layer).filter(([, value]) => value != null));
}

/** Las fechas de la API son `yyyy-MM-dd` sin zona: se leen como fecha local, no como UTC. */
function localDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const LONG_DATE = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const SHORT_DATE = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
const PRICE = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function longSessionDate(isoDate: string): string {
  const formatted = LONG_DATE.format(localDate(isoDate));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function shortSessionDate(isoDate: string): string {
  return SHORT_DATE.format(localDate(isoDate)).replace('.', '');
}

const TICKET_DATE = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** Fecha de sello para la entrada: «lun 18 may». */
export function ticketSessionDate(isoDate: string): string {
  return TICKET_DATE.format(localDate(isoDate)).replace(/[.,]/g, '');
}

export function sessionPrice(value: number): string {
  return PRICE.format(value);
}

export interface PriceParts {
  whole: string;
  fraction: string;
  currency: string;
}

/** El precio en piezas, para componerlo como un anuncio: entero grande, céntimos y moneda pequeños. */
export function sessionPriceParts(value: number): PriceParts {
  const parts = PRICE.formatToParts(value);
  const pick = (types: string[]) =>
    parts
      .filter((part) => types.includes(part.type))
      .map((part) => part.value)
      .join('');
  return {
    whole: pick(['minusSign', 'integer', 'group']),
    fraction: pick(['decimal', 'fraction']),
    currency: pick(['currency']),
  };
}

export function sessionDuration(minutes: number | null | undefined): string {
  if (!minutes) {
    return 'Por confirmar';
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) {
    return `${rest} min`;
  }

  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function humanizeSessionType(type: string): string {
  const words = type.toLowerCase().split('_').filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
