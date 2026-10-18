import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { EstadoEvento, EventoAdmin } from '../../../models/api.models';
import { SessionDossierLayer } from '../../../models/session-dossier.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import {
  errorMessage,
  fieldErrors,
  formatDay,
  humanizeCode,
  matches,
  plural,
  sessionState,
} from '../../../shared/panel/panel-format';
import {
  DOSSIER_FIELDS,
  DOSSIER_TABS,
  DossierField,
  EMPTY_ROW,
  isListKind,
  ROW_PARTS,
} from './dossier-fields';
import { DossierRowEditorComponent } from './dossier-row-editor.component';

type Filter = 'TODAS' | EstadoEvento | 'ARCHIVADAS';
type Dossier = Record<string, unknown>;

/** Una fila de un apartado con lista, tal como está en la selección: en qué sesiones aparece. */
interface SharedRow {
  key: string;
  value: unknown;
  ids: number[];
}

/** Una versión de un apartado de texto y las sesiones que la tienen. */
interface TextVersion {
  value: string;
  ids: number[];
}

/**
 * Edición en lote de los expedientes: se eligen sesiones (con los mismos filtros que la lista) y se
 * cambia su contenido de una vez. Cada apartado dice cómo está en la selección («igual en las 5»,
 * «en 2 de 5»). Los cambios se acumulan aquí y se guardan juntos, todos o ninguno.
 */
@Component({
  selector: 'app-admin-dossier-bulk-panel',
  standalone: true,
  imports: [FormsModule, DossierRowEditorComponent],
  templateUrl: './admin-dossier-bulk-panel.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-dossier-bulk-panel.component.css'],
})
export class AdminDossierBulkPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);

  readonly sessions = signal<EventoAdmin[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  /** Errores del último guardado, ya con el nombre de su sesión. */
  readonly saveErrors = signal<string[]>([]);

  // Filtros y selección.
  readonly query = signal('');
  readonly filter = signal<Filter>('TODAS');
  readonly type = signal('');
  readonly selected = signal<ReadonlySet<number>>(new Set());

  // Contenido: lo guardado y la copia de trabajo, que cambia con cada acción hasta guardar.
  private original: Record<number, Dossier> = {};
  private working: Record<number, Dossier> = {};
  /** Sube con cada cambio en la copia de trabajo, para que lo que depende de ella se recalcule. */
  private readonly revision = signal(0);

  readonly tabs = DOSSIER_TABS;
  readonly tab = signal(DOSSIER_TABS[0].id);
  /** El texto que se va a poner en cada apartado de texto, por apartado. */
  readonly textDrafts = signal<Record<string, string>>({});
  /** La fila nueva de cada apartado con lista, por apartado. */
  readonly newRows = signal<Record<string, unknown>>({});
  /** La fila que se está modificando: su apartado, su clave y el valor nuevo. */
  readonly editingRow = signal<{ field: string; key: string; value: unknown } | null>(null);

  readonly day = formatDay;
  readonly state = sessionState;
  readonly typeLabel = humanizeCode;
  readonly plural = plural;

  readonly types = computed(() => [...new Set(this.sessions().map((session) => session.tipoEvento))].sort());

  readonly filters = computed(() => {
    const list = this.sessions().filter((session) => !session.archivada);
    const count = (estado: EstadoEvento) => list.filter((session) => session.estado === estado).length;
    return [
      { value: 'TODAS' as Filter, label: 'Todas', count: list.length },
      { value: 'ACTIVO' as Filter, label: 'Activas', count: count('ACTIVO') },
      { value: 'CANCELADO' as Filter, label: 'Canceladas', count: count('CANCELADO') },
      { value: 'TERMINADO' as Filter, label: 'Terminadas', count: count('TERMINADO') },
      { value: 'ARCHIVADAS' as Filter, label: 'Archivadas', count: this.sessions().length - list.length },
    ];
  });

  readonly visible = computed(() => {
    const filter = this.filter();
    const query = this.query();
    const type = this.type();
    return this.sessions().filter(
      (session) =>
        (filter === 'ARCHIVADAS'
          ? session.archivada
          : !session.archivada && (filter === 'TODAS' || session.estado === filter)) &&
        (!type || session.tipoEvento === type) &&
        matches(query, session.nombre, this.number(session), humanizeCode(session.tipoEvento), session.direccion),
    );
  });

  /** Las seleccionadas, en el orden de la lista. */
  readonly selection = computed(() => this.sessions().filter((session) => this.selected().has(session.idEvento)));

  readonly selectedIds = computed(() => this.selection().map((session) => session.idEvento));

  /** Cómo está la casilla de «todas las filtradas»: marcada, a medias o vacía. */
  readonly allVisible = computed(() => {
    const visible = this.visible();
    const chosen = visible.filter((session) => this.selected().has(session.idEvento)).length;
    return chosen === 0 ? 'none' : chosen === visible.length ? 'all' : 'some';
  });

  /** Las sesiones con cambios sin guardar. */
  readonly changedIds = computed(() => {
    this.revision();
    return this.sessions()
      .map((session) => session.idEvento)
      .filter((id) => stableJson(clean(this.dossierOf(id))) !== stableJson(clean(this.original[id] ?? {})));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.admin.getEventos().subscribe({
      next: (sessions) => {
        this.admin.getExpedientes().subscribe({
          next: (stored) => {
            this.original = {};
            for (const [id, dossier] of Object.entries(stored)) {
              this.original[Number(id)] = dossier as Dossier;
            }
            this.working = structuredClone(this.original);
            this.sessions.set(sessions);
            this.loading.set(false);
            this.touch();
          },
          error: () => this.failLoad(),
        });
      },
      error: () => this.failLoad(),
    });
  }

  number(session: EventoAdmin): string {
    return String(session.idEvento).padStart(3, '0');
  }

  // Selección.

  toggle(session: EventoAdmin): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(session.idEvento)) {
        next.delete(session.idEvento);
      } else {
        next.add(session.idEvento);
      }
      return next;
    });
    this.editingRow.set(null);
  }

  /** La casilla de la cabecera: si están todas las filtradas, las quita; si no, las pone. */
  toggleVisible(): void {
    const ids = this.visible().map((session) => session.idEvento);
    const all = this.allVisible() === 'all';
    this.selected.update((set) => {
      const next = new Set(set);
      for (const id of ids) {
        if (all) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
    this.editingRow.set(null);
  }

  clearSelection(): void {
    this.selected.set(new Set());
    this.editingRow.set(null);
  }

  // Cómo está cada apartado en la selección.

  isList(field: DossierField): boolean {
    return isListKind(field.kind);
  }

  /** Las versiones de un apartado de texto en la selección (vacío incluido), de la más repetida a la menos. */
  textVersions(field: DossierField): TextVersion[] {
    this.revision();
    const versions = new Map<string, number[]>();
    for (const session of this.selection()) {
      const value = text(this.dossierOf(session.idEvento)[field.key]);
      versions.set(value, [...(versions.get(value) ?? []), session.idEvento]);
    }
    return [...versions.entries()]
      .map(([value, ids]) => ({ value, ids }))
      .sort((a, b) => b.ids.length - a.ids.length);
  }

  /** Las filas de un apartado con lista en la selección: cada una, con las sesiones que la tienen. */
  sharedRows(field: DossierField): SharedRow[] {
    this.revision();
    const rows = new Map<string, SharedRow>();
    for (const session of this.selection()) {
      for (const value of list(this.dossierOf(session.idEvento)[field.key])) {
        const key = rowKey(value);
        const row = rows.get(key) ?? { key, value, ids: [] };
        if (!row.ids.includes(session.idEvento)) {
          row.ids.push(session.idEvento);
        }
        rows.set(key, row);
      }
    }
    return [...rows.values()];
  }

  /** «En todas», «En 2 de 5»… */
  coverage(ids: number[]): string {
    const total = this.selected().size;
    return ids.length === total ? (total === 1 ? 'En la elegida' : `En las ${total}`) : `En ${ids.length} de ${total}`;
  }

  /** Los nombres de las sesiones, para el título de una cobertura parcial. */
  names(ids: number[]): string {
    return this.sessions()
      .filter((session) => ids.includes(session.idEvento))
      .map((session) => `${this.number(session)} · ${session.nombre}`)
      .join('\n');
  }

  /** Una fila como se lee: etiqueta y valor, hora y título… */
  rowText(field: DossierField, value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    const record = (value ?? {}) as Record<string, string>;
    return ROW_PARTS[field.kind]
      .map((part) => record[part])
      .filter(Boolean)
      .join(' · ');
  }

  // Cambios: todos van a la copia de trabajo de las sesiones elegidas.

  textDraft(field: DossierField): string {
    const draft = this.textDrafts()[field.key];
    if (draft !== undefined) {
      return draft;
    }
    const versions = this.textVersions(field);
    return versions.length === 1 ? versions[0].value : '';
  }

  setTextDraft(field: DossierField, value: string): void {
    this.textDrafts.update((drafts) => ({ ...drafts, [field.key]: value }));
  }

  /** Pone el texto (o lo deja vacío) en todas las elegidas. */
  applyText(field: DossierField): void {
    const value = this.textDraft(field).trim();
    for (const session of this.selection()) {
      const dossier = this.dossierOf(session.idEvento);
      if (value) {
        dossier[field.key] = value;
      } else {
        delete dossier[field.key];
      }
    }
    this.textDrafts.update((drafts) => {
      const next = { ...drafts };
      delete next[field.key];
      return next;
    });
    this.touch();
  }

  /** La fila nueva de un apartado: vacía hasta que se escribe. */
  newRow(field: DossierField): unknown {
    return this.newRows()[field.key] ?? EMPTY_ROW[field.kind]();
  }

  setNewRow(field: DossierField, value: unknown): void {
    this.newRows.update((rows) => ({ ...rows, [field.key]: value }));
  }

  canAdd(field: DossierField): boolean {
    return this.rowText(field, this.newRow(field)).trim().length > 0;
  }

  /** Añade la fila nueva al final en las elegidas que no la tengan ya. */
  addRow(field: DossierField): void {
    const value = this.newRow(field);
    const key = rowKey(value);
    for (const session of this.selection()) {
      const rows = this.listOf(session.idEvento, field);
      if (!rows.some((row) => rowKey(row) === key)) {
        rows.push(structuredClone(value));
      }
    }
    this.newRows.update((rows) => {
      const next = { ...rows };
      delete next[field.key];
      return next;
    });
    this.touch();
  }

  /** Pone la fila en las elegidas que aún no la tienen, al final. */
  spread(field: DossierField, row: SharedRow): void {
    for (const session of this.selection()) {
      if (!row.ids.includes(session.idEvento)) {
        this.listOf(session.idEvento, field).push(structuredClone(row.value));
      }
    }
    this.touch();
  }

  /** Quita la fila de las elegidas que la tienen. */
  removeRow(field: DossierField, row: SharedRow): void {
    for (const id of row.ids) {
      const rows = this.listOf(id, field);
      const index = rows.findIndex((item) => rowKey(item) === row.key);
      if (index >= 0) {
        rows.splice(index, 1);
      }
    }
    this.touch();
  }

  startEdit(field: DossierField, row: SharedRow): void {
    this.editingRow.set({ field: field.key, key: row.key, value: structuredClone(row.value) });
  }

  isEditing(field: DossierField, row: SharedRow): boolean {
    const editing = this.editingRow();
    return editing?.field === field.key && editing.key === row.key;
  }

  setEditValue(value: unknown): void {
    this.editingRow.update((editing) => (editing ? { ...editing, value } : editing));
  }

  /** Cambia la fila, en su sitio, en las elegidas que la tienen. */
  saveEdit(field: DossierField, row: SharedRow): void {
    const editing = this.editingRow();
    if (!editing) {
      return;
    }
    for (const id of row.ids) {
      const rows = this.listOf(id, field);
      const index = rows.findIndex((item) => rowKey(item) === row.key);
      if (index >= 0) {
        rows[index] = structuredClone(editing.value);
      }
    }
    this.editingRow.set(null);
    this.touch();
  }

  cancelEdit(): void {
    this.editingRow.set(null);
  }

  /** Cuántos apartados de la pestaña tienen cambios sin guardar, para marcarla. */
  tabChanged(tabId: string): boolean {
    const tab = DOSSIER_TABS.find((item) => item.id === tabId);
    return this.changedIds().some((id) =>
      tab!.fields.some(
        (field) =>
          stableJson(clean(this.dossierOf(id))[field.key] ?? null) !==
          stableJson(clean(this.original[id] ?? {})[field.key] ?? null),
      ),
    );
  }

  // Guardar o descartar.

  async discard(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Descartar los cambios?',
      message: `Se pierden los cambios sin guardar de ${plural(this.changedIds().length, 'sesión', 'sesiones')}.`,
      confirm: 'Descartar',
      danger: true,
    });
    if (confirmed) {
      this.working = structuredClone(this.original);
      this.textDrafts.set({});
      this.newRows.set({});
      this.editingRow.set(null);
      this.saveErrors.set([]);
      this.touch();
    }
  }

  async save(): Promise<void> {
    const ids = this.changedIds();
    if (!ids.length || this.saving()) {
      return;
    }
    const names = this.sessions()
      .filter((session) => ids.includes(session.idEvento))
      .map((session) => `${this.number(session)} · ${session.nombre}`);
    const listed = names.length > 6 ? `${names.slice(0, 6).join(', ')} y ${names.length - 6} más` : names.join(', ');
    const confirmed = await this.confirm.ask({
      title: `¿Guardar ${plural(ids.length, 'sesión', 'sesiones')}?`,
      message: `Cambia el contenido de la ficha pública de: ${listed}.`,
      confirm: 'Guardar cambios',
    });
    if (!confirmed) {
      return;
    }
    const batch: Record<string, SessionDossierLayer> = {};
    for (const id of ids) {
      batch[id] = clean(this.dossierOf(id)) as SessionDossierLayer;
    }
    this.saving.set(true);
    this.saveErrors.set([]);
    this.admin.guardarExpedientesLote(batch).subscribe({
      next: (saved) => {
        for (const [id, dossier] of Object.entries(saved)) {
          this.original[Number(id)] = dossier as Dossier;
          this.working[Number(id)] = structuredClone(dossier as Dossier);
        }
        this.saving.set(false);
        this.touch();
        this.notice.set({ text: `Guardado el contenido de ${plural(ids.length, 'sesión', 'sesiones')}.`, error: false });
      },
      error: (error) => {
        this.saving.set(false);
        const errors = fieldErrors(error);
        const labels = Object.fromEntries(DOSSIER_FIELDS.map((field) => [field.key, field.label]));
        this.saveErrors.set(
          Object.entries(errors).map(([key, message]) => {
            const [id, field] = key.split('.');
            const session = this.sessions().find((item) => item.idEvento === Number(id));
            const name = session ? `${this.number(session)} · ${session.nombre}` : `Sesión ${id}`;
            return `${name} — ${labels[field] ?? field}: ${message}`;
          }),
        );
        this.notice.set({
          text: Object.keys(errors).length
            ? 'No se ha guardado nada: revisa lo que se indica.'
            : errorMessage(error, 'No se han podido guardar los cambios.'),
          error: true,
        });
      },
    });
  }

  /** Para salir de la página con cambios sin guardar (ver admin.routes.ts). */
  /** Antes de cerrar su diálogo (ver Sesiones): con cambios sin guardar, pregunta. */
  async canLeave(): Promise<boolean> {
    if (!this.changedIds().length) {
      return true;
    }
    return this.confirm.ask({
      title: '¿Cerrar sin guardar?',
      message: `Hay cambios sin guardar en ${plural(this.changedIds().length, 'sesión', 'sesiones')}. Si cierras, se pierden.`,
      confirm: 'Cerrar sin guardar',
      danger: true,
    });
  }

  private dossierOf(id: number): Dossier {
    return (this.working[id] ??= {});
  }

  private listOf(id: number, field: DossierField): unknown[] {
    const dossier = this.dossierOf(id);
    if (!Array.isArray(dossier[field.key])) {
      dossier[field.key] = [];
    }
    return dossier[field.key] as unknown[];
  }

  private touch(): void {
    this.revision.update((value) => value + 1);
  }

  private failLoad(): void {
    this.loading.set(false);
    this.loadError.set(true);
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** La clave de una fila para reconocerla en todas las sesiones: su contenido, sin espacios sobrantes. */
function rowKey(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  const record = (value ?? {}) as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .map((key) => [key, typeof record[key] === 'string' ? (record[key] as string).trim() : record[key]]),
  );
}

/** Un expediente sin apartados vacíos: así se compara y así se guarda. */
function clean(dossier: Dossier): Dossier {
  const result: Dossier = {};
  for (const [key, value] of Object.entries(dossier)) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

/** JSON con las claves ordenadas: dos expedientes iguales dan lo mismo aunque se escribieran en otro orden. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}
