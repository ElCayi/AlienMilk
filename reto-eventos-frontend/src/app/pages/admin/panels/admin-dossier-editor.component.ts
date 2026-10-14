import { Component, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import { AdminDossierFormComponent, DossierTarget } from './admin-dossier-form.component';

/**
 * El expediente en su propio diálogo, para las capas que no son de una sesión: la común (desde
 * Sesiones) y la de cada tipo (desde Tipos de sesión). El de cada sesión va dentro de Modificar sesión.
 */
@Component({
  selector: 'app-admin-dossier-editor',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent, AdminDossierFormComponent],
  template: `
    <app-panel-dialog [heading]="heading()" [wide]="true" [tall]="true">
      <form novalidate (ngSubmit)="save()">
        <app-admin-dossier-form />

        @if (formError(); as message) {
          <p class="notice is-error form-error" role="alert">{{ message }}</p>
        }

        <div class="form-actions">
          <button type="button" class="btn" (click)="dialog().close()">Volver</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()" [attr.aria-busy]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar expediente' }}
          </button>
        </div>
      </form>
    </app-panel-dialog>
  `,
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminDossierEditorComponent {
  readonly saved = output<string>();

  readonly target = signal<DossierTarget | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly dialog = viewChild.required(PanelDialogComponent);
  private readonly form = viewChild.required(AdminDossierFormComponent);

  open(target: DossierTarget): void {
    this.target.set(target);
    this.formError.set(null);
    this.form().load(target);
    this.dialog().open();
  }

  heading(): string {
    const target = this.target();
    return target ? `Expediente · ${target.name}` : 'Expediente';
  }

  save(): void {
    const target = this.target();
    if (!target || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.form().save(target.scope).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog().close();
        this.saved.emit(`Expediente de ${target.name} guardado.`);
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(this.form().showErrors(error));
      },
    });
  }
}
