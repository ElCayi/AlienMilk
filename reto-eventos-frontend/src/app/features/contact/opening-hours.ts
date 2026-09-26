import { Contacto } from '../../models/api.models';

type Horario = Pick<Contacto, 'diasApertura' | 'horaApertura' | 'horaCierre' | 'zonaHoraria'>;

export interface EstadoSede {
  abierta: boolean;
  /** «Abierta ahora» / «Cerrada». */
  estado: string;
  /** «Cierra a las 23:30» / «Abre el jueves a las 18:00». */
  detalle: string;
  /** Hora local de la sede, «19:42». */
  horaLocal: string;
}

/** Índice ISO-8601: DIAS[1] = lunes … DIAS[7] = domingo. */
export const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const MINUTOS_DIA = 24 * 60;
const DIA_INGLES: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** «18:00:00» → «18:00». */
export function formatHour(hora: string): string {
  return hora.slice(0, 5);
}

/** [4, 5, 6, 7] → «Jueves a domingo»; [1, 3, 5] → «Lunes, miércoles y viernes». */
export function describeDays(dias: number[]): string {
  const unicos = [...new Set(dias)].filter((dia) => dia >= 1 && dia <= 7).sort((a, b) => a - b);

  if (!unicos.length) {
    return '';
  }
  if (unicos.length === 7) {
    return 'Todos los días';
  }
  if (unicos.length === 1) {
    return capitalize(DIAS[unicos[0]]);
  }

  // Un tramo seguido puede cruzar el fin de semana (sábado a lunes), así que se prueba cada inicio.
  if (unicos.length > 2) {
    for (const inicio of unicos) {
      const tramo = unicos.map((_, i) => ((inicio - 1 + i) % 7) + 1);
      if (tramo.every((dia) => unicos.includes(dia))) {
        return `${capitalize(DIAS[tramo[0]])} a ${DIAS[tramo[tramo.length - 1]]}`;
      }
    }
  }

  const nombres = unicos.map((dia) => DIAS[dia]);
  return capitalize(`${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`);
}

/** «Jueves a domingo · 18:00 a 23:30». */
export function describeSchedule(horario: Horario): string {
  return `${describeDays(horario.diasApertura)} · ${formatHour(horario.horaApertura)} a ${formatHour(horario.horaCierre)}`;
}

/**
 * Estado de la sede en su propia zona horaria, sea cual sea la del visitante. Un cierre anterior a
 * la apertura significa que la jornada termina de madrugada, ya en el día siguiente.
 */
export function siteStatus(horario: Horario, ahora: Date): EstadoSede | null {
  const local = localTime(ahora, horario.zonaHoraria);
  if (!local) {
    return null;
  }

  const apertura = toMinutes(horario.horaApertura);
  const cierre = toMinutes(horario.horaCierre);
  const cruzaMedianoche = cierre < apertura;
  const abreHoy = horario.diasApertura.includes(local.dia);
  const abrioAyer = horario.diasApertura.includes(((local.dia + 5) % 7) + 1);

  const abierta = cruzaMedianoche
    ? (abreHoy && local.minutos >= apertura) || (abrioAyer && local.minutos < cierre)
    : abreHoy && local.minutos >= apertura && local.minutos < cierre;

  if (abierta) {
    return {
      abierta,
      estado: 'Abierta ahora',
      detalle: `Cierra a las ${formatHour(horario.horaCierre)}`,
      horaLocal: local.texto,
    };
  }

  return {
    abierta,
    estado: 'Cerrada',
    detalle: nextOpening(horario, local.dia, local.minutos, apertura),
    horaLocal: local.texto,
  };
}

function nextOpening(horario: Horario, hoy: number, minutos: number, apertura: number): string {
  const hora = formatHour(horario.horaApertura);

  for (let desfase = 0; desfase <= 7; desfase++) {
    const dia = ((hoy - 1 + desfase) % 7) + 1;
    if (!horario.diasApertura.includes(dia) || (desfase === 0 && minutos >= apertura)) {
      continue;
    }
    if (desfase === 0) {
      return `Abre hoy a las ${hora}`;
    }
    if (desfase === 1) {
      return `Abre mañana a las ${hora}`;
    }
    return `Abre el ${DIAS[dia]} a las ${hora}`;
  }

  return 'Sin horario de apertura';
}

function localTime(
  ahora: Date,
  zona: string,
): { dia: number; minutos: number; texto: string } | null {
  try {
    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: zona,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(ahora);
    const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((p) => p.type === tipo)?.value ?? '';
    const horas = Number(parte('hour'));
    const minutos = Number(parte('minute'));

    return {
      dia: DIA_INGLES[parte('weekday')],
      minutos: (horas * 60 + minutos) % MINUTOS_DIA,
      texto: `${parte('hour')}:${parte('minute')}`,
    };
  } catch {
    return null;
  }
}

function toMinutes(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

function capitalize(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
