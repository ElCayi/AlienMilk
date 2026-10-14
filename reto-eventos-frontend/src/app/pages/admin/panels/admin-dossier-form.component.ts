import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService, ExpedienteAmbito } from '../../../core/services/admin.service';
import { composeDossierLayers } from '../../../features/sessions/session-dossier';
import {
  SessionDossier,
  SessionDossierLayer,
  SessionDossierSource,
} from '../../../models/session-dossier.models';
import { errorMessage, fieldErrors } from '../../../shared/panel/panel-format';

/** Cómo se edita cada apartado: un texto, una lista de líneas o una lista de filas con varios datos. */
type Kind = 'text' | 'textarea' | 'paragraphs' | 'lines' | 'pairs' | 'steps' | 'faq' | 'partners';

type EditableKey = Exclude<keyof SessionDossier, 'procedencia'>;

interface FieldDef {
  key: EditableKey;
  label: string;
  kind: Kind;
  help?: string;
  /** Se suma a lo de las capas anteriores en lugar de sustituirlo. */
  additive?: boolean;
}

interface TabDef {
  id: string;
  label: string;
  fields: FieldDef[];
}

/** Las pestañas de la ficha pública, con lo que enseña cada una. */
const TABS: TabDef[] = [
  {
    id: 'expediente',
    label: 'Expediente',
    fields: [
      { key: 'entradilla', label: 'Entradilla', kind: 'textarea', help: 'El primer párrafo, destacado.' },
      { key: 'texto', label: 'Texto', kind: 'paragraphs' },
      { key: 'horario', label: 'Horario', kind: 'text', help: 'Sale junto a la fecha, en la cabecera.' },
      { key: 'creditos', label: 'Créditos', kind: 'textarea', help: 'La nota final, en pequeño.' },
    ],
  },
  { id: 'cata', label: 'Notas de cata', fields: [{ key: 'notasCata', label: 'Notas de cata', kind: 'pairs' }] },
  { id: 'programa', label: 'Desarrollo', fields: [{ key: 'programa', label: 'Programa', kind: 'steps' }] },
  {
    id: 'acceso',
    label: 'Acceso',
    fields: [
      { key: 'acceso', label: 'Condiciones de acceso', kind: 'pairs', additive: true },
      { key: 'recomendaciones', label: 'Recomendaciones', kind: 'lines' },
    ],
  },
  { id: 'equipo', label: 'Equipo', fields: [{ key: 'equipo', label: 'Equipo', kind: 'pairs' }] },
  {
    id: 'preguntas',
    label: 'Preguntas',
    fields: [{ key: 'preguntas', label: 'Preguntas frecuentes', kind: 'faq', additive: true }],
  },
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

const EMPTY_ROW: Record<Kind, () => unknown> = {
  text: () => '',
  textarea: () => '',
  paragraphs: () => '',
  lines: () => '',
  pairs: () => ({ etiqueta: '', valor: '' }),
  steps: () => ({ hora: '', titulo: '', detalle: '' }),
  faq: () => ({ pregunta: '', respuesta: '' }),
  partners: () => ({ rol: '', nombre: '', detalle: '' }),
};

/** Lo que el editor necesita saber para abrirse: de quién es la capa y cómo se llama. */
export interface DossierTarget {
  scope: ExpedienteAmbito;
  /** Lo que va en el título: «Expediente de …». */
  name: string;
  /** El tipo de la sesión (su nombre, como en las capas), para saber qué hereda. */
  typeName?: string;
}

/**
 * El expediente de las sesiones, con las mismas pestañas que la ficha pública. Edita una capa: la
 * común, la de un tipo o la de una sesión. Lo que la capa no declara se hereda de las anteriores y se
 * ve atenuado; «Propio» lo copia para cambiarlo, y quitarlo vuelve a heredar. Acceso y preguntas se
 * suman: lo heredado se ve y lo propio se añade debajo.
 *
 * No guarda por su cuenta: lo pone dentro de un diálogo quien lo usa (el de Modificar sesión o
 * AdminDossierEditorComponent), que llama a `save` con el resto de su formulario.
 */
@Component({
  selector: 'app-admin-dossier-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-dossier-form.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-dossier-form.component.css'],
})
export class AdminDossierFormComponent {
  private readonly admin = inject(AdminService);

  readonly tabs = TABS;
  readonly tab = signal(TABS[0].id);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly errors = signal<Record<string, string>>({});

  private readonly source = signal<SessionDossierSource | null>(null);
  private readonly scopeKind = signal<ExpedienteAmbito['tipo']>('general');
  /** El tipo de la sesión: en Modificar sesión sigue al campo Tipo, y con él lo que se hereda. */
  readonly typeName = signal<string | undefined>(undefined);

  /** Lo que la capa hereda de las anteriores (nada, si es la común). */
  readonly inherited = computed<SessionDossier | null>(() => {
    const source = this.source();
    const kind = this.scopeKind();
    if (!source || kind === 'general') {
      return null;
    }
    return kind === 'sesion'
      ? composeDossierLayers(source.general, source.porTipo[this.typeName() ?? ''])
      : composeDossierLayers(source.general);
  });
  readonly inheritedFrom = computed(() =>
    this.scopeKind() === 'sesion' ? 'del tipo y de la capa común' : 'de la capa común',
  );

  /** La capa en edición. Un apartado ausente se hereda. */
  draft: Record<string, unknown> = {};
  private snapshot = '{}';

  /** Carga las capas y deja la de `target` lista para editar (vacía, si es una sesión nueva). */
  load(target: DossierTarget): void {
    const scope = target.scope;
    this.scopeKind.set(scope.tipo);
    this.typeName.set(target.typeName);
    this.tab.set(TABS[0].id);
    this.errors.set({});
    this.loadError.set(null);
    this.draft = {};
    this.snapshot = '{}';
    this.source.set(null);
    this.loading.set(true);
    this.admin.getExpedientes().subscribe({
      next: (source) => {
        const own =
          scope.tipo === 'general'
            ? source.general
            : scope.tipo === 'tipo'
              ? source.porTipo[target.typeName ?? '']
              : source.porSesion[String(scope.id)];
        this.draft = structuredClone((own ?? {}) as Record<string, unknown>);
        this.source.set(source);
        this.snapshot = JSON.stringify(this.layer());
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.loadError.set(errorMessage(error, 'No se ha podido cargar el expediente.'));
      },
    });
  }

  /** Si hay algo que guardar: la capa ha cambiado desde que se cargó. */
  changed(): boolean {
    return !this.loading() && !this.loadError() && JSON.stringify(this.layer()) !== this.snapshot;
  }

  /** Guarda la capa en `scope` (en una sesión nueva, la que se acaba de crear). */
  save(scope: ExpedienteAmbito) {
    this.errors.set({});
    return this.admin.guardarExpediente(scope, this.layer());
  }

  /** Tras guardar: lo guardado es el nuevo punto de partida. */
  markSaved(): void {
    this.snapshot = JSON.stringify(this.layer());
  }

  /** Coloca los errores del servidor en sus apartados y abre la primera pestaña con alguno. */
  showErrors(error: unknown): string {
    const errors = fieldErrors(error);
    this.errors.set(errors);
    const firstTab = TABS.find((tab) => tab.fields.some((field) => errors[field.key]));
    if (firstTab) {
      this.tab.set(firstTab.id);
    }
    return Object.keys(errors).length
      ? 'Revisa los apartados marcados del expediente.'
      : errorMessage(error, 'No se ha podido guardar el expediente.');
  }

  /** Si el apartado tiene contenido propio en esta capa (o, en la común, siempre). */
  isOwn(field: FieldDef): boolean {
    return !this.inherited() || field.additive === true || this.draft[field.key] !== undefined;
  }

  /** «Propio» copia lo heredado para cambiarlo; quitarlo lo borra de la capa y vuelve a heredar. */
  setOwn(field: FieldDef, own: boolean): void {
    if (own) {
      const inherited = this.inherited()?.[field.key];
      this.draft[field.key] = structuredClone(inherited ?? (isList(field.kind) ? [] : ''));
    } else {
      delete this.draft[field.key];
    }
  }

  value(field: FieldDef): unknown {
    if (this.draft[field.key] === undefined && isList(field.kind) && this.isOwn(field)) {
      this.draft[field.key] = [];
    }
    return this.draft[field.key];
  }

  rows(field: FieldDef): unknown[] {
    return this.value(field) as unknown[];
  }

  /** Lo heredado, para enseñarlo atenuado. */
  inheritedRows(field: FieldDef): unknown[] {
    const value = this.inherited()?.[field.key];
    return Array.isArray(value) ? value : [];
  }

  inheritedText(field: FieldDef): string {
    const value = this.inherited()?.[field.key];
    return typeof value === 'string' ? value : '';
  }

  addRow(field: FieldDef): void {
    this.rows(field).push(EMPTY_ROW[field.kind]());
  }

  removeRow(field: FieldDef, index: number): void {
    this.rows(field).splice(index, 1);
  }

  moveRow(field: FieldDef, index: number, step: -1 | 1): void {
    const rows = this.rows(field);
    const target = index + step;
    if (target < 0 || target >= rows.length) {
      return;
    }
    [rows[index], rows[target]] = [rows[target], rows[index]];
  }

  /** Las líneas sueltas (párrafos, recomendaciones) son cadenas: se cambian por posición. */
  setLine(field: FieldDef, index: number, value: string): void {
    this.rows(field)[index] = value;
  }

  asText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  asRecord(value: unknown): Record<string, string> {
    return value as Record<string, string>;
  }

  tabHasError(tab: TabDef): boolean {
    const errors = this.errors();
    return tab.fields.some((field) => errors[field.key]);
  }

  error(field: FieldDef): string | null {
    return this.errors()[field.key] ?? null;
  }

  trackIndex(index: number): number {
    return index;
  }

  /**
   * La capa tal como se guarda. Acceso y preguntas se suman: vacíos no añaden nada, y así una capa
   * sin nada propio se queda vacía (y el servidor la borra).
   */
  private layer(): SessionDossierLayer {
    const layer = { ...this.draft };
    for (const field of TABS.flatMap((tab) => tab.fields)) {
      const value = layer[field.key];
      if (field.additive && Array.isArray(value) && !value.length) {
        delete layer[field.key];
      }
    }
    return layer as SessionDossierLayer;
  }
}

function isList(kind: Kind): boolean {
  return kind !== 'text' && kind !== 'textarea';
}
