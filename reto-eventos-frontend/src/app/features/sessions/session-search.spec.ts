import { EventoListado } from '../../models/api.models';
import { filterSessions, normalizeSessionSearch } from './session-search';

const sessions: EventoListado[] = [
  {
    idEvento: 1,
    nombre: 'Cata Cósmica',
    fechaInicio: '2026-05-20',
    precio: 35,
    aforoMaximo: 20,
    estado: 'ACTIVO',
    tipoEvento: 'CATA_COSMICA',
  },
  {
    idEvento: 2,
    nombre: 'Laboratorio de espuma',
    fechaInicio: '2026-06-10',
    precio: 55,
    aforoMaximo: 12,
    estado: 'ACTIVO',
    tipoEvento: 'LAB_SENSORIAL',
  },
];

describe('session search', () => {
  it('normalizes case, whitespace and accents', () => {
    expect(normalizeSessionSearch('  CÓSMICA ')).toBe('cosmica');
  });

  it('filters across public metadata', () => {
    expect(filterSessions(sessions, 'cosmica')).toEqual([sessions[0]]);
    expect(filterSessions(sessions, '55')).toEqual([sessions[1]]);
  });

  it('combines search and classification', () => {
    expect(filterSessions(sessions, '', 'LAB_SENSORIAL')).toEqual([sessions[1]]);
    expect(filterSessions(sessions, 'cata', 'LAB_SENSORIAL')).toEqual([]);
  });
});
