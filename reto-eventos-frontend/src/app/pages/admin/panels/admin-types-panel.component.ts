import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { TipoEvento, TipoEventoPayload } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import { AdminDossierFormComponent } from './admin-dossier-form.component';
import {
  errorMessage,
  fieldErrors,
  humanizeCode,
  plural,
} from '../../../shared/panel/panel-format';

/**
 * Tipos de sesión: la clasificación del programa y el filtro de la página pública. Un tipo con
 * sesiones no se borra: dejaría esas sesiones sin tipo.
 */
@Component({
  selector: 'app-admin-types-panel',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent, AdminDossierFormComponent],
  templateUrl: './admin-types-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminTypesPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);

  readonly types = signal<TipoEvento[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<number | null>(null);

  readonly dialog = viewChild.required(PanelDialogComponent);
  /** El expediente del tipo (lo que heredan todas sus sesiones), segunda página de Modificar tipo. */
  readonly dossierForm = viewChild.required(AdminDossierFormComponent);
  readonly page = signal<'datos' | 'expediente'>('datos');
  readonly editing = signal<TipoEvento | null>(null);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal<string | null>(null);
  form: TipoEventoPayload = { nombre: '', descripcion: '' };

  readonly label = humanizeCode;
  readonly plural = plural;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.admin.getTipos().subscribe({
      next: (types) => {
        this.types.set([...types].sort(byName));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  openNew(): void {
    this.editing.set(null);
    this.form = { nombre: '', descripcion: '' };
    this.resetErrors();
    this.page.set('datos');
    this.dossierForm().load({ scope: { tipo: 'tipo', id: 0 }, name: 'Nuevo tipo' });
    this.dialog().open();
  }

  openEdit(type: TipoEvento): void {
    this.editing.set(type);
    this.form = { nombre: type.nombre, descripcion: type.descripcion ?? '' };
    this.resetErrors();
    this.page.set('datos');
    this.dossierForm().load({
      scope: { tipo: 'tipo', id: type.idTipo },
      name: this.label(type.nombre),
      typeName: type.nombre,
    });
    this.dialog().open();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const editing = this.editing();
    this.saving.set(true);
    this.resetErrors();
    const request = editing
      ? this.admin.actualizarTipo(editing.idTipo, this.form)
      : this.admin.crearTipo(this.form);
    request.subscribe({
      next: (saved) => {
        this.types.update((list) =>
          (list.some((item) => item.idTipo === saved.idTipo)
            ? list.map((item) => (item.idTipo === saved.idTipo ? saved : item))
            : [...list, saved]
          ).sort(byName),
        );
        // Guardado: si el expediente falla, se reintenta como modificación, sin crearlo dos veces.
        this.editing.set(saved);
        const finish = () => {
          this.saving.set(false);
          this.dialog().close();
          this.notice.set({
            text: `Tipo «${humanizeCode(saved.nombre)}» ${editing ? 'actualizado' : 'creado'}.`,
            error: false,
          });
        };
        const dossier = this.dossierForm();
        if (!dossier.changed()) {
          finish();
          return;
        }
        dossier.save({ tipo: 'tipo', id: saved.idTipo }).subscribe({
          next: () => {
            dossier.markSaved();
            finish();
          },
          error: (error) => {
            this.saving.set(false);
            this.page.set('expediente');
            this.formError.set(`Los datos se han guardado, pero el expediente no. ${dossier.showErrors(error)}`);
          },
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.page.set('datos');
        const errors = fieldErrors(error);
        this.errors.set(errors);
        this.formError.set(
          Object.keys(errors).length
            ? 'Revisa los campos marcados.'
            : errorMessage(error, 'No se ha podido guardar el tipo.'),
        );
      },
    });
  }

  async remove(type: TipoEvento): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Borrar el tipo?',
      message: `«${humanizeCode(type.nombre)}» dejará de aparecer en el filtro de la programación. No se puede deshacer.`,
      confirm: 'Borrar tipo',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(type.idTipo);
    this.admin.borrarTipo(type.idTipo).subscribe({
      next: () => {
        this.busy.set(null);
        this.types.update((list) => list.filter((item) => item.idTipo !== type.idTipo));
        this.notice.set({ text: `Tipo «${humanizeCode(type.nombre)}» borrado.`, error: false });
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido borrar el tipo.'), error: true });
        this.load();
      },
    });
  }

  error(field: string): string | null {
    return this.errors()[field] ?? null;
  }

  private resetErrors(): void {
    this.errors.set({});
    this.formError.set(null);
  }
}

function byName(a: TipoEvento, b: TipoEvento): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}
