import { SessionDossier } from '../../../models/session-dossier.models';

/**
 * Los apartados del expediente de una sesión, agrupados en las pestañas de su ficha pública. Los usan
 * el editor de una sesión (AdminDossierFormComponent) y la edición en lote.
 */

/** Cómo se edita cada apartado: un texto, una lista de líneas o una lista de filas con varios datos. */
export type DossierKind = 'text' | 'textarea' | 'paragraphs' | 'lines' | 'pairs' | 'steps' | 'faq' | 'partners';

/** Todos menos la procedencia, que la ficha pública no enseña (se conserva al guardar). */
export type DossierKey = Exclude<keyof SessionDossier, 'procedencia'>;

export interface DossierField {
  key: DossierKey;
  label: string;
  kind: DossierKind;
  help?: string;
}

export interface DossierTab {
  id: string;
  label: string;
  fields: DossierField[];
}

export const DOSSIER_TABS: DossierTab[] = [
  {
    id: 'expediente',
    label: 'Expediente',
    fields: [
      { key: 'entradilla', label: 'Entradilla', kind: 'textarea', help: 'El primer párrafo, destacado.' },
      { key: 'texto', label: 'Texto', kind: 'paragraphs' },
      { key: 'creditos', label: 'Créditos', kind: 'textarea', help: 'La nota final, en pequeño.' },
    ],
  },
  { id: 'cata', label: 'Notas de cata', fields: [{ key: 'notasCata', label: 'Notas de cata', kind: 'pairs' }] },
  { id: 'programa', label: 'Desarrollo', fields: [{ key: 'programa', label: 'Programa', kind: 'steps' }] },
  {
    id: 'acceso',
    label: 'Acceso',
    fields: [
      { key: 'acceso', label: 'Condiciones de acceso', kind: 'pairs' },
      { key: 'recomendaciones', label: 'Recomendaciones', kind: 'lines' },
    ],
  },
  { id: 'equipo', label: 'Equipo', fields: [{ key: 'equipo', label: 'Equipo', kind: 'pairs' }] },
  { id: 'preguntas', label: 'Preguntas', fields: [{ key: 'preguntas', label: 'Preguntas frecuentes', kind: 'faq' }] },
  {
    id: 'colaboraciones',
    label: 'Colaboraciones',
    fields: [
      {
        key: 'colaboradores',
        label: 'Hacen posible esta sesión',
        kind: 'partners',
        help: 'El bloque de colaboraciones, debajo de la ficha.',
      },
    ],
  },
];

export const DOSSIER_FIELDS: DossierField[] = DOSSIER_TABS.flatMap((tab) => tab.fields);

/** Una fila vacía de cada tipo de apartado, para «Añadir». */
export const EMPTY_ROW: Record<DossierKind, () => unknown> = {
  text: () => '',
  textarea: () => '',
  paragraphs: () => '',
  lines: () => '',
  pairs: () => ({ etiqueta: '', valor: '' }),
  steps: () => ({ hora: '', titulo: '', detalle: '' }),
  faq: () => ({ pregunta: '', respuesta: '' }),
  partners: () => ({ rol: '', nombre: '', detalle: '' }),
};

export function isListKind(kind: DossierKind): boolean {
  return kind !== 'text' && kind !== 'textarea';
}

/** Los datos de cada fila, en orden, para pintarla o compararla. */
export const ROW_PARTS: Record<DossierKind, string[]> = {
  text: [],
  textarea: [],
  paragraphs: [],
  lines: [],
  pairs: ['etiqueta', 'valor'],
  steps: ['hora', 'titulo', 'detalle'],
  faq: ['pregunta', 'respuesta'],
  partners: ['rol', 'nombre', 'detalle'],
};
