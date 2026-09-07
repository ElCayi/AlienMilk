import { EventoListado } from '../../models/api.models';
import { anomaly, archiveCode, compatibility, sampleCode, sessionImage } from './session.presenter';

function session(idEvento: number): EventoListado {
  return {
    idEvento,
    nombre: 'Cata orbital',
    fechaInicio: '2026-05-20',
    precio: 35,
    aforoMaximo: 20,
    estado: 'ACTIVO',
    tipoEvento: 'CATA_COSMICA',
  };
}

describe('session presenter', () => {
  it('creates stable archive metadata from an event', () => {
    const event = session(1);

    expect(archiveCode(event)).toBe('AM-S/021');
    expect(sampleCode(event)).toBe('CL-07');
    expect(compatibility(event)).toBe('96,9 %');
    expect(anomaly(event)).toBe('Extracción restringida');
  });

  it('selects images deterministically and safely for any numeric id', () => {
    expect(sessionImage(session(2))).toBe('alienmilk-session-unnamed.jpg');
    expect(sessionImage(session(-1))).toBe('alienmilk-session-road2.jpg');
    expect(sampleCode(session(-1))).toBe('CL-93');
  });
});
