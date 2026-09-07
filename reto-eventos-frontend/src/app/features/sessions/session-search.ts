import { EventoListado } from '../../models/api.models';

export function normalizeSessionSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterSessions(
  sessions: EventoListado[],
  query: string,
  category = 'todas',
): EventoListado[] {
  const normalizedQuery = normalizeSessionSearch(query);

  return sessions.filter((session) => {
    const matchesCategory = category === 'todas' || session.tipoEvento === category;
    const searchable = normalizeSessionSearch(
      `${session.nombre} ${session.tipoEvento} ${session.fechaInicio} ${session.precio}`,
    );
    return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
