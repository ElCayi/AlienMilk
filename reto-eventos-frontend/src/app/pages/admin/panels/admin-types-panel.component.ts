import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { TipoEvento, TipoEventoPayload } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import {
  errorMessage,
  fieldErrors,
  humanizeCode,
  plural,
} from '../../../shared/panel/panel-format';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

/**
 * Tipos de sesión: la clasificación del programa y el filtro de la página pública. Un tipo con
 * sesiones no se borra: dejaría esas sesiones sin tipo.
 */
@Component({
  selector: 'app-admin-types-panel',
  standalone: true,
  imports: [SectionHelpComponent, FormsModule, PanelDialogComponent],
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
    this.dialog().open();
  }

  openEdit(type: TipoEvento): void {
    this.editing.set(type);
    this.form = { nombre: type.nombre, descripcion: type.descripcion ?? '' };
    this.resetErrors();
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
        this.saving.set(false);
        this.types.update((list) =>
          (editing ? list.map((item) => (item.idTipo === saved.idTipo ? saved : item)) : [...list, saved]).sort(
            byName,
          ),
        );
        this.dialog().close();
        this.notice.set({
          text: `Tipo «${humanizeCode(saved.nombre)}» ${editing ? 'actualizado' : 'creado'}.`,
          error: false,
        });
      },
      error: (error) => {
        this.saving.set(false);
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
