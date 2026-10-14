import { Component, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService, ExpedienteAmbito } from '../../../core/services/admin.service';
import { composeDossierLayers } from '../../../features/sessions/session-dossier';
import { SessionDossier, SessionDossierLayer } from '../../../models/session-dossier.models';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
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
 * Editor del expediente de las sesiones, con las mismas pestañas que la ficha pública. Edita una capa:
 * la común, la de un tipo o la de una sesión. Lo que la capa no declara se hereda de las anteriores y
 * se ve atenuado; «Propio» lo copia para cambiarlo, y quitarlo vuelve a heredar. Acceso y preguntas se
 * suman: lo heredado se ve y lo propio se añade debajo.
 */
@Component({
  selector: 'app-admin-dossier-editor',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent],
  templateUrl: './admin-dossier-editor.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-dossier-editor.component.css'],
})
export class AdminDossierEditorComponent {
  private readonly admin = inject(AdminService);

  readonly saved = output<string>();

  readonly tabs = TABS;
  readonly tab = signal(TABS[0].id);
  readonly target = signal<DossierTarget | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal<string | null>(null);

  /** Lo que la capa hereda de las anteriores (nada, si es la común). */
  readonly inherited = signal<SessionDossier | null>(null);
  readonly inheritedFrom = signal('');
  /** La capa en edición. Un apartado ausente se hereda. */
  draft: Record<string, unknown> = {};

  private readonly dialog = viewChild.required(PanelDialogComponent);

  open(target: DossierTarget): void {
    this.target.set(target);
    this.tab.set(TABS[0].id);
    this.errors.set({});
    this.formError.set(null);
    this.draft = {};
    this.inherited.set(null);
    this.loading.set(true);
    this.dialog().open();
    this.admin.getExpedientes().subscribe({
      next: (source) => {
        const scope = target.scope;
        const own =
          scope.tipo === 'general'
            ? source.general
            : scope.tipo === 'tipo'
              ? source.porTipo[target.typeName ?? '']
              : source.porSesion[String(scope.id)];
        this.draft = structuredClone((own ?? {}) as Record<string, unknown>);
        if (scope.tipo === 'sesion') {
          this.inherited.set(composeDossierLayers(source.general, source.porTipo[target.typeName ?? '']));
          this.inheritedFrom.set('del tipo y de la capa común');
        } else if (scope.tipo === 'tipo') {
          this.inherited.set(composeDossierLayers(source.general));
          this.inheritedFrom.set('de la capa común');
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.formError.set(errorMessage(error, 'No se ha podido cargar el expediente.'));
      },
    });
  }

  heading(): string {
    const target = this.target();
    return target ? `Expediente · ${target.name}` : 'Expediente';
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

  save(): void {
    const target = this.target();
    if (!target || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errors.set({});
    this.formError.set(null);
    // Acceso y preguntas se suman: vacíos no añaden nada, y así una capa sin nada propio se borra.
    const layer = { ...this.draft };
    for (const field of TABS.flatMap((tab) => tab.fields)) {
      const value = layer[field.key];
      if (field.additive && Array.isArray(value) && !value.length) {
        delete layer[field.key];
      }
    }
    this.admin.guardarExpediente(target.scope, layer as SessionDossierLayer).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog().close();
        this.saved.emit(`Expediente de ${target.name} guardado.`);
      },
      error: (error) => {
        this.saving.set(false);
        const errors = fieldErrors(error);
        this.errors.set(errors);
        const firstTab = TABS.find((tab) => tab.fields.some((field) => errors[field.key]));
        if (firstTab) {
          this.tab.set(firstTab.id);
        }
        this.formError.set(
          Object.keys(errors).length
            ? 'Revisa los apartados marcados.'
            : errorMessage(error, 'No se ha podido guardar el expediente.'),
        );
      },
    });
  }

  close(): void {
    this.dialog().close();
  }
}

function isList(kind: Kind): boolean {
  return kind !== 'text' && kind !== 'textarea';
}
