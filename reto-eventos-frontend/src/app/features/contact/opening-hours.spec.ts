import { describeDays, describeSchedule, siteStatus } from './opening-hours';

const madrid = {
  diasApertura: [4, 5, 6, 7],
  horaApertura: '18:00:00',
  horaCierre: '23:30:00',
  zonaHoraria: 'Europe/Madrid',
};

// 2026-10-01 es jueves. En octubre Madrid va a UTC+2.
const madridTime = (dia: number, hora: string) =>
  new Date(`2026-10-${String(dia).padStart(2, '0')}T${hora}:00+02:00`);

describe('describeDays', () => {
  it('names a consecutive run by its ends', () => {
    expect(describeDays([4, 5, 6, 7])).toBe('Jueves a domingo');
  });

  it('keeps a run that wraps over the weekend together', () => {
    expect(describeDays([7, 1, 6])).toBe('Sábado a lunes');
  });

  it('lists days that are not consecutive', () => {
    expect(describeDays([5, 1, 3])).toBe('Lunes, miércoles y viernes');
    expect(describeDays([1, 2])).toBe('Lunes y martes');
  });

  it('handles every day and a single day', () => {
    expect(describeDays([1, 2, 3, 4, 5, 6, 7])).toBe('Todos los días');
    expect(describeDays([3])).toBe('Miércoles');
  });
});

describe('describeSchedule', () => {
  it('joins days and hours', () => {
    expect(describeSchedule(madrid)).toBe('Jueves a domingo · 18:00 a 23:30');
  });
});

describe('siteStatus', () => {
  it('is open during opening hours', () => {
    const estado = siteStatus(madrid, madridTime(1, '19:42'));
    expect(estado?.abierta).toBe(true);
    expect(estado?.detalle).toBe('Cierra a las 23:30');
    expect(estado?.horaLocal).toBe('19:42');
  });

  it('announces the opening later the same day', () => {
    expect(siteStatus(madrid, madridTime(1, '10:00'))?.detalle).toBe('Abre hoy a las 18:00');
  });

  it('announces the next opening day after closing time', () => {
    // Domingo 4 a las 23:45 → jueves 8.
    const estado = siteStatus(madrid, madridTime(4, '23:45'));
    expect(estado?.abierta).toBe(false);
    expect(estado?.detalle).toBe('Abre el jueves a las 18:00');
  });

  it('says tomorrow when the next day opens', () => {
    expect(siteStatus(madrid, madridTime(7, '12:00'))?.detalle).toBe('Abre mañana a las 18:00');
  });

  it('uses the site time zone, not the visitor one', () => {
    // 17:30 UTC del jueves son las 19:30 en Madrid.
    expect(siteStatus(madrid, new Date('2026-10-01T17:30:00Z'))?.abierta).toBe(true);
  });

  it('keeps a session that runs past midnight open into the next day', () => {
    const nocturna = { ...madrid, diasApertura: [6], horaApertura: '22:00', horaCierre: '03:00' };
    // Sábado 3 a las 23:00 y domingo 4 a las 02:00: abierta. Domingo a las 04:00: cerrada.
    expect(siteStatus(nocturna, madridTime(3, '23:00'))?.abierta).toBe(true);
    expect(siteStatus(nocturna, madridTime(4, '02:00'))?.abierta).toBe(true);
    expect(siteStatus(nocturna, madridTime(4, '04:00'))?.abierta).toBe(false);
  });

  it('returns null for an unknown time zone', () => {
    expect(siteStatus({ ...madrid, zonaHoraria: 'Marte/Olympus' }, new Date())).toBeNull();
  });
});
