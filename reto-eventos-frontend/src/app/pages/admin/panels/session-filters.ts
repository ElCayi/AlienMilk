import { EventoAdmin } from '../../../models/api.models';
import { dateFields, FilterField, FilterPreset, FilterValues, matchesDate } from '../../../shared/panel/filter-bar.component';
import { humanizeCode } from '../../../shared/panel/panel-format';

/**
 * Los filtros de las sesiones, los mismos en la lista de Sesiones y en la edición en lote: qué campos hay,
 * qué vale «sin filtrar», los filtros listos y si una sesión pasa.
 */

/** Los filtros y lo que valen sin filtrar: las no archivadas, de cualquier fecha, tipo y ocupación. */
export const SESSION_FILTER_DEFAULTS: FilterValues = {
  q: '',
  estado: 'vivas',
  fecha: '',
  desde: '',
  hasta: '',
  tipo: '',
  ocupacion: '',
};

/** Dónde guarda cada cual sus filtros de sesiones: los mismos en la lista y en el lote. */
export const SESSION_FILTER_STORAGE = 'am-filtros-sesiones';

/**
 * Si una sesión pasa los filtros que no son de texto: estado, fecha, tipo y ocupación. Pura: la usan las
 * tablas y las cuentas de los filtros listos.
 */
export function sessionPasses(session: EventoAdmin, values: FilterValues, today = new Date()): boolean {
  const estado = {
    vivas: !session.archivada,
    activas: !session.archivada && session.estado === 'ACTIVO',
    canceladas: !session.archivada && session.estado === 'CANCELADO',
    terminadas: !session.archivada && session.estado === 'TERMINADO',
    archivadas: session.archivada,
    todas: true,
  }[values['estado'] || 'vivas'];
  if (!estado || !matchesDate(session.fechaInicio, values, today)) {
    return false;
  }
  if (values['tipo'] && String(session.idTipo) !== values['tipo']) {
    return false;
  }
  const libres = session.aforoMaximo - session.plazasReservadas;
  return (
    {
      '': true,
      'sin-reservas': session.plazasReservadas === 0,
      'bajo-minimo': session.plazasReservadas < session.minimoAsistencia,
      'casi-completas': libres > 0 && session.plazasReservadas >= session.aforoMaximo * 0.8,
      completas: libres <= 0,
    }[values['ocupacion'] ?? ''] ?? true
  );
}

/** Los campos del panel de filtros; los tipos, los que haya. */
export function sessionFilterFields(types: { idTipo: number; nombre: string }[]): FilterField[] {
  return [
    { key: 'q', label: 'Buscar', type: 'text', placeholder: 'Nº, nombre, referencia, tipo o lugar' },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: [
        { value: 'vivas', label: 'Sin las archivadas' },
        { value: 'activas', label: 'Activas' },
        { value: 'canceladas', label: 'Canceladas' },
        { value: 'terminadas', label: 'Terminadas' },
        { value: 'archivadas', label: 'Archivadas' },
        { value: 'todas', label: 'Todas, también las archivadas' },
      ],
    },
    ...dateFields('Fecha'),
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { value: '', label: 'Cualquier tipo' },
        ...types.map((type) => ({ value: String(type.idTipo), label: humanizeCode(type.nombre) })),
      ],
    },
    {
      key: 'ocupacion',
      label: 'Ocupación',
      type: 'select',
      options: [
        { value: '', label: 'Cualquiera' },
        { value: 'sin-reservas', label: 'Sin reservas' },
        { value: 'bajo-minimo', label: 'Por debajo del mínimo' },
        { value: 'casi-completas', label: 'Casi completas (80 % o más)' },
        { value: 'completas', label: 'Completas' },
      ],
    },
  ];
}

/** Lo de todos los días, con cuántas hay ahora mismo. */
export function sessionFilterPresets(sessions: EventoAdmin[]): FilterPreset[] {
  const presets: FilterPreset[] = [
    { label: 'Hoy', values: { fecha: 'hoy' } },
    { label: 'Próximos 7 días', values: { fecha: 'semana' } },
    { label: 'Activas', values: { estado: 'activas' } },
    { label: 'Por debajo del mínimo', values: { estado: 'activas', ocupacion: 'bajo-minimo' } },
    { label: 'Casi completas', values: { ocupacion: 'casi-completas' } },
    { label: 'Sin reservas', values: { ocupacion: 'sin-reservas' } },
    { label: 'Terminadas por archivar', values: { estado: 'terminadas' } },
    { label: 'Canceladas', values: { estado: 'canceladas' } },
    { label: 'Archivadas', values: { estado: 'archivadas' } },
  ];
  return presets.map((preset) => ({
    ...preset,
    count: sessions.filter((session) => sessionPasses(session, { ...SESSION_FILTER_DEFAULTS, ...preset.values })).length,
  }));
}
