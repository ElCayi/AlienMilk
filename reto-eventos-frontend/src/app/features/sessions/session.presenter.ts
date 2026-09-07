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

export function sessionImage(session: EventoListado): string {
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
