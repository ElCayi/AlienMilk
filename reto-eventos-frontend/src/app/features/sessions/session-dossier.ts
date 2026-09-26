import { EventoDetalle } from '../../models/api.models';
import {
  SessionDossier,
  SessionDossierLayer,
  SessionDossierSource,
} from '../../models/session-dossier.models';

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
  estacion: { complemento: '', franja: '', operadores: [] },
  creditos: '',
};

function applyLayer(base: SessionDossier, layer: SessionDossierLayer | undefined): SessionDossier {
  if (!layer) {
    return base;
  }

  return {
    ...base,
    ...layer,
    acceso: [...base.acceso, ...(layer.acceso ?? [])],
    preguntas: [...base.preguntas, ...(layer.preguntas ?? [])],
  };
}

/**
 * Compone el expediente de una sesión a partir de sus capas. Lo que la API ya sabe de la sesión
 * (su descripción) sirve de respaldo para que ningún expediente quede vacío.
 */
export function buildSessionDossier(
  session: EventoDetalle,
  source: SessionDossierSource,
): SessionDossier {
  const dossier = [
    source.general,
    source.porTipo[session.tipoEvento],
    source.porSesion[String(session.idEvento)],
  ].reduce(applyLayer, EMPTY_DOSSIER);

  return {
    ...dossier,
    entradilla: dossier.entradilla || session.descripcion,
    texto: dossier.texto.length ? dossier.texto : [session.descripcion].filter(Boolean),
  };
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

export function sessionPrice(value: number): string {
  return PRICE.format(value);
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
