import { EventoDetalle } from '../../models/api.models';
import {
  buildSessionDossier,
  humanizeSessionType,
  longSessionDate,
  sessionDuration,
} from './session-dossier';

const session: EventoDetalle = {
  idEvento: 7,
  nombre: 'Cata orbital',
  descripcion: 'Descripción registrada en la API',
  fechaInicio: '2026-05-01',
  duracion: 150,
  direccion: 'Hangar 7',
  precio: 35,
  aforoMaximo: 20,
  minimoAsistencia: 5,
  estado: 'ACTIVO',
  idTipo: 1,
  horaInicio: '19:15',
  tipoEvento: 'CATA_COSMICA',
};

describe('session dossier', () => {
  it('completes what the session has stored', () => {
    const dossier = buildSessionDossier(session, {
      acceso: [{ etiqueta: 'Edad', valor: '18' }],
      procedencia: 'Órbita de Orión',
    });

    expect(dossier.procedencia).toBe('Órbita de Orión');
    expect(dossier.acceso.map((item) => item.etiqueta)).toEqual(['Edad']);
    expect(dossier.preguntas).toEqual([]);
  });

  it('falls back to the API description for sessions without editorial content', () => {
    const dossier = buildSessionDossier(session, null);

    expect(dossier.entradilla).toBe('Descripción registrada en la API');
    expect(dossier.texto).toEqual(['Descripción registrada en la API']);
    expect(dossier.procedencia).toBe('No declarada');
  });

  it('formats dates and durations for the public file', () => {
    expect(longSessionDate('2026-05-01')).toBe('Viernes, 1 de mayo de 2026');
    expect(sessionDuration(150)).toBe('2 h 30 min');
    expect(sessionDuration(45)).toBe('45 min');
    expect(sessionDuration(120)).toBe('2 h');
    expect(humanizeSessionType('LABORATORIO_SENSORIAL')).toBe('Laboratorio sensorial');
  });
});
