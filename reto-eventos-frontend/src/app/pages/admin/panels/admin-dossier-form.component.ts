import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { SessionDossierLayer } from '../../../models/session-dossier.models';
import { errorMessage, fieldErrors } from '../../../shared/panel/panel-format';
import { DOSSIER_FIELDS, DOSSIER_TABS, DossierField, DossierTab, EMPTY_ROW, isListKind } from './dossier-fields';
import { DossierRowEditorComponent } from './dossier-row-editor.component';

/** Una sesión de la que se puede copiar el contenido. */
export interface DossierSource {
  idEvento: number;
  nombre: string;
}

/**
 * El expediente de una sesión, con las mismas pestañas que su ficha pública. Va dentro de Modificar
 * sesión, que lo guarda junto con el resto (\`save\`). Se puede partir del contenido de otra sesión;
 * para cambiar muchas a la vez está la edición en lote.
 */
@Component({
  selector: 'app-admin-dossier-form',
  standalone: true,
  imports: [FormsModule, DossierRowEditorComponent],
  templateUrl: './admin-dossier-form.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-dossier-form.component.css'],
})
export class AdminDossierFormComponent {
  private readonly admin = inject(AdminService);

  /** Las sesiones de las que se puede copiar (sin la que se edita). */
  readonly sources = input<DossierSource[]>([]);

  readonly tabs = DOSSIER_TABS;
  readonly tab = signal(DOSSIER_TABS[0].id);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly errors = signal<Record<string, string>>({});
  /** De qué sesión se ha copiado el contenido, si se ha hecho (hasta guardar, nada cambia). */
  readonly copiedFrom = signal<string | null>(null);

  /** El expediente en edición. */
  draft: Record<string, unknown> = {};
  private stored: Record<string, SessionDossierLayer> = {};
  private snapshot = '{}';

  /** Carga el expediente de la sesión (vacío, si es nueva). */
  load(idEvento: number | null): void {
    this.tab.set(DOSSIER_TABS[0].id);
    this.errors.set({});
    this.loadError.set(null);
    this.copiedFrom.set(null);
    this.draft = {};
    this.snapshot = '{}';
    this.loading.set(true);
    this.admin.getExpedientes().subscribe({
      next: (stored) => {
        this.stored = stored;
        this.draft = structuredClone((idEvento == null ? {} : (stored[idEvento] ?? {})) as Record<string, unknown>);
        this.snapshot = JSON.stringify(this.layer());
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.loadError.set(errorMessage(error, 'No se ha podido cargar el expediente.'));
      },
    });
  }

  /** Sustituye todo el contenido por el de otra sesión (la procedencia, también). */
  copyFrom(idEvento: number | string): void {
    const source = this.sources().find((item) => item.idEvento === Number(idEvento));
    if (!source) {
      return;
    }
    this.draft = structuredClone((this.stored[source.idEvento] ?? {}) as Record<string, unknown>);
    this.copiedFrom.set(source.nombre);
  }

  /** Si hay algo que guardar: ha cambiado desde que se cargó. */
  changed(): boolean {
    return !this.loading() && !this.loadError() && JSON.stringify(this.layer()) !== this.snapshot;
  }

  save(idEvento: number) {
    this.errors.set({});
    return this.admin.guardarExpediente(idEvento, this.layer());
  }

  /** Tras guardar: lo guardado es el nuevo punto de partida. */
  markSaved(): void {
    this.snapshot = JSON.stringify(this.layer());
    this.copiedFrom.set(null);
  }

  /** Coloca los errores del servidor en sus apartados y abre la primera pestaña con alguno. */
  showErrors(error: unknown): string {
    const errors = fieldErrors(error);
    this.errors.set(errors);
    const firstTab = DOSSIER_TABS.find((tab) => tab.fields.some((field) => errors[field.key]));
    if (firstTab) {
      this.tab.set(firstTab.id);
    }
    return Object.keys(errors).length
      ? 'Revisa los apartados marcados del expediente.'
      : errorMessage(error, 'No se ha podido guardar el expediente.');
  }

  rows(field: DossierField): unknown[] {
    if (!Array.isArray(this.draft[field.key])) {
      this.draft[field.key] = [];
    }
    return this.draft[field.key] as unknown[];
  }

  addRow(field: DossierField): void {
    this.rows(field).push(EMPTY_ROW[field.kind]());
  }

  removeRow(field: DossierField, index: number): void {
    this.rows(field).splice(index, 1);
  }

  moveRow(field: DossierField, index: number, step: -1 | 1): void {
    const rows = this.rows(field);
    const target = index + step;
    if (target < 0 || target >= rows.length) {
      return;
    }
    [rows[index], rows[target]] = [rows[target], rows[index]];
  }


  tabHasError(tab: DossierTab): boolean {
    const errors = this.errors();
    return tab.fields.some((field) => errors[field.key]);
  }

  error(field: DossierField): string | null {
    return this.errors()[field.key] ?? null;
  }

  isList(field: DossierField): boolean {
    return isListKind(field.kind);
  }

  /** Lo que se está editando, para la vista previa: lo mismo que se guardaría. */
  preview(): SessionDossierLayer | null {
    return this.loading() || this.loadError() ? null : this.layer();
  }

  /** El expediente tal como se guarda: las listas vacías no cuentan. */
  private layer(): SessionDossierLayer {
    const layer = { ...this.draft };
    for (const field of DOSSIER_FIELDS) {
      const value = layer[field.key];
      if ((Array.isArray(value) && !value.length) || value === '') {
        delete layer[field.key];
      }
    }
    return layer as SessionDossierLayer;
  }
}
