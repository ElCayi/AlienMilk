import { environment } from '../../../environments/environment';
import { EventoListado } from '../../models/api.models';

const SESSION_IMAGES = [
  'alienmilk-session-red.jpg',
  'alienmilk-session-lab.jpg',
  'alienmilk-session-unnamed.jpg',
  'alienmilk-session-conejo-de-chocolate.jpg',
  'alienmilk-session-road.jpg',
  'alienmilk-session-road2.jpg',
] as const;

const SESSION_ANOMALIES = [
  'Procedencia no declarada',
  'Extracción restringida',
  'Frecuencia no catalogada',
] as const;

function positiveIndex(value: number, length: number): number {
  return ((value % length) + length) % length;
}

/**
 * La foto de la sesión: la propia, si se subió desde el panel (su nombre cambia con cada foto, y la
 * dirección con él), o una de las de la web, según su número.
 */
export function sessionImage(session: EventoListado): string {
  if (session.imagen) {
    return `${environment.apiUrl}/eventos/${session.idEvento}/imagen?v=${encodeURIComponent(session.imagen)}`;
  }
  return SESSION_IMAGES[positiveIndex(session.idEvento, SESSION_IMAGES.length)];
}

export function archiveCode(session: EventoListado): string {
  return `AM-S/${String(session.idEvento + 20).padStart(3, '0')}`;
}

export function sampleCode(session: EventoListado): string {
  return `CL-${String(positiveIndex(session.idEvento * 7, 100)).padStart(2, '0')}`;
}

export function compatibility(session: EventoListado): string {
  return `${(96.8 + positiveIndex(session.idEvento, 9) / 10).toFixed(1).replace('.', ',')} %`;
}

export function anomaly(session: EventoListado): string {
  return SESSION_ANOMALIES[positiveIndex(session.idEvento, SESSION_ANOMALIES.length)];
}

/**
 * El horario de una sesión: su hora de inicio y, con la duración, la de fin (19:15 – 21:45). Pasada la
 * medianoche, la de fin sigue en reloj de 24 horas (22:30 – 00:15).
 */
export function sessionSchedule(session: { horaInicio?: string | null; duracion?: number | null }): string {
  const start = session.horaInicio?.slice(0, 5);
  if (!start) {
    return '';
  }
  if (!session.duracion) {
    return start;
  }
  const [hours, minutes] = start.split(':').map(Number);
  const end = (hours * 60 + minutes + session.duracion) % (24 * 60);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${start} – ${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
}

/**
 * Minutos antes del inicio en que cierran las reservas de la web: los 30 que tiene Stripe para pagar más
 * los 10 del cierre del control de ingreso. Por teléfono o en taquilla, hasta el cierre (10 minutos).
 */
export const BOOKING_CLOSES_MINUTES = 40;

/**
 * Si una sesión aún admite reservas: hasta {@link BOOKING_CLOSES_MINUTES} minutos antes de empezar,
 * en la hora de quien mira. El servidor tiene la última palabra (en la hora de Madrid).
 */
export function bookingsOpen(session: { fechaInicio: string; horaInicio?: string | null }, now = new Date()): boolean {
  const start = new Date(`${session.fechaInicio}T${session.horaInicio?.slice(0, 5) || '00:00'}:00`);
  return now.getTime() < start.getTime() - BOOKING_CLOSES_MINUTES * 60_000;
}

/** Si una reserva aún se puede cancelar: hasta el día anterior a la sesión. */
export function cancellable(fechaInicio: string, now = new Date()): boolean {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` < fechaInicio.slice(0, 10);
}
