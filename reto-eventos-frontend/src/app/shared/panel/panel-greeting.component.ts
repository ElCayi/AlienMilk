import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { FitLineDirective } from '../fit-line/fit-line.directive';
import { fieldErrors } from './panel-format';

/**
 * El saludo del panel («Hola, Administrador») con un lápiz para cambiar el nombre ahí mismo: Intro
 * guarda, Escape vuelve. Cambia solo el nombre de quien ha entrado (PATCH /api/auth/me).
 */
@Component({
  selector: 'app-panel-greeting',
  standalone: true,
  imports: [FitLineDirective],
  template: `
    @if (editing()) {
      <form class="greeting-form" (submit)="$event.preventDefault(); save()">
        <h1>
          <span aria-hidden="true">Hola,</span>
          <input
            #field
            class="greeting-input"
            name="nombre"
            maxlength="30"
            autocomplete="given-name"
            aria-label="Tu nombre"
            [value]="draft()"
            [attr.aria-invalid]="error() ? true : null"
            [disabled]="saving()"
            (input)="draft.set($any($event.target).value)"
            (keydown.escape)="cancel()"
          />
        </h1>
        <div class="greeting-actions">
          <button type="submit" class="greeting-icon" [disabled]="saving()" aria-label="Guardar el nombre">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          </button>
          <button type="button" class="greeting-icon" [disabled]="saving()" aria-label="Dejarlo como estaba" (click)="cancel()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </form>
      @if (error(); as message) {
        <p class="greeting-error" role="alert">{{ message }}</p>
      }
    } @else {
      <!-- El nombre siempre entero: si no cabe con el lápiz, la letra se encoge (appFitLine). -->
      <h1 class="greeting" appFitLine>
        Hola, {{ name() }}<button
          type="button"
          class="greeting-icon greeting-edit"
          aria-label="Cambiar tu nombre"
          (click)="edit()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
        </button>
      </h1>
    }
  `,
  styleUrl: './panel-greeting.component.css',
})
export class PanelGreetingComponent {
  private readonly auth = inject(AuthService);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  readonly name = () => this.auth.currentUser()?.nombre ?? '';
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly draft = signal('');
  readonly error = signal<string | null>(null);

  edit(): void {
    this.draft.set(this.name());
    this.error.set(null);
    this.editing.set(true);
    queueMicrotask(() => this.field()?.nativeElement.select());
  }

  cancel(): void {
    this.editing.set(false);
    this.error.set(null);
  }

  save(): void {
    const nombre = this.draft().trim();
    if (nombre === this.name()) {
      this.cancel();
      return;
    }
    this.saving.set(true);
    this.auth.renameMe(nombre).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
      },
      error: (error) => {
        this.saving.set(false);
        // Lo que dice el servidor solo si es sobre el nombre; cualquier otro fallo, en palabras de la casa.
        this.error.set(fieldErrors(error)['nombre'] ?? 'No se ha podido cambiar el nombre.');
        queueMicrotask(() => this.field()?.nativeElement.focus());
      },
    });
  }
}
