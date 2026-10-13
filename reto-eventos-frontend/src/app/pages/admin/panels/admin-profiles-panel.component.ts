import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../core/services/admin.service';
import { Perfil, PerfilPayload } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import {
  errorMessage,
  fieldErrors,
  plural,
  profileLabel,
} from '../../../shared/panel/panel-format';

/**
 * Perfiles de las cuentas. Administrador y Cliente son los del sistema, los que dan acceso: no se
 * renombran ni se borran. Uno nuevo sirve para clasificar cuentas, pero no abre ninguna zona.
 */
@Component({
  selector: 'app-admin-profiles-panel',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent],
  templateUrl: './admin-profiles-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminProfilesPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);

  readonly profiles = signal<Perfil[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<number | null>(null);

  readonly dialog = viewChild.required(PanelDialogComponent);
  readonly editing = signal<Perfil | null>(null);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal<string | null>(null);
  form: PerfilPayload = { nombre: '' };

  readonly label = profileLabel;
  readonly plural = plural;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.admin.getPerfiles().subscribe({
      next: (profiles) => {
        this.profiles.set([...profiles].sort(bySystemThenName));
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
    this.form = { nombre: 'ROLE_' };
    this.resetErrors();
    this.dialog().open();
  }

  openEdit(profile: Perfil): void {
    this.editing.set(profile);
    this.form = { nombre: profile.nombre };
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
      ? this.admin.actualizarPerfil(editing.idPerfil, this.form)
      : this.admin.crearPerfil(this.form);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.profiles.update((list) =>
          (editing ? list.map((item) => (item.idPerfil === saved.idPerfil ? saved : item)) : [...list, saved]).sort(
            bySystemThenName,
          ),
        );
        this.dialog().close();
        this.notice.set({
          text: `Perfil «${profileLabel(saved.nombre)}» ${editing ? 'actualizado' : 'creado'}.`,
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
            : errorMessage(error, 'No se ha podido guardar el perfil.'),
        );
      },
    });
  }

  async remove(profile: Perfil): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Borrar el perfil?',
      message: `«${profileLabel(profile.nombre)}» desaparecerá de la lista de perfiles. No se puede deshacer.`,
      confirm: 'Borrar perfil',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(profile.idPerfil);
    this.admin.borrarPerfil(profile.idPerfil).subscribe({
      next: () => {
        this.busy.set(null);
        this.profiles.update((list) => list.filter((item) => item.idPerfil !== profile.idPerfil));
        this.notice.set({ text: `Perfil «${profileLabel(profile.nombre)}» borrado.`, error: false });
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido borrar el perfil.'), error: true });
        this.load();
      },
    });
  }

  /** Por qué no se puede borrar, para el título del botón. */
  lockReason(profile: Perfil): string {
    if (profile.sistema) {
      return 'Perfil del sistema: no se puede borrar';
    }
    return profile.usuarios ? `Lo ${profile.usuarios === 1 ? 'tiene una cuenta' : `tienen ${profile.usuarios} cuentas`}` : '';
  }

  error(field: string): string | null {
    return this.errors()[field] ?? null;
  }

  private resetErrors(): void {
    this.errors.set({});
    this.formError.set(null);
  }
}

function bySystemThenName(a: Perfil, b: Perfil): number {
  return Number(b.sistema) - Number(a.sistema) || a.nombre.localeCompare(b.nombre, 'es');
}
