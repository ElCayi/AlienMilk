import { Component, inject, input, output, signal } from '@angular/core';
import { map, Observable } from 'rxjs';

import { AdminService } from '../../core/services/admin.service';
import { errorMessage, plural } from '../../shared/panel/panel-format';
import { DemoRestoreService } from './demo-restore.service';

type DemoKind = 'sesiones' | 'reservas';

const COPY: Record<DemoKind, { button: string; one: string; many: string; none: string; failure: string }> = {
  sesiones: {
    button: 'Añadir sesiones demo',
    one: 'sesión añadida al final del programa',
    many: 'sesiones añadidas al final del programa',
    none: 'No se ha añadido ninguna sesión.',
    failure: 'No se han podido añadir las sesiones demo.',
  },
  reservas: {
    button: 'Añadir reservas demo',
    one: 'reserva añadida',
    many: 'reservas añadidas',
    none: 'Ninguna sesión admite más reservas ahora mismo.',
    failure: 'No se han podido añadir las reservas demo.',
  },
};

/**
 * El pie de las secciones con datos de demostración: «Restaurar demo» (la demo entera, como en la
 * pestaña Demo) y el atajo para añadir datos de ejemplo a esa sección, con lo que ha pasado al lado.
 */
@Component({
  selector: 'app-demo-foot',
  standalone: true,
  template: `
    <footer class="panel-foot">
      @if (demo.failure(); as message) {
        <p class="field-error" role="alert">{{ message }}</p>
      } @else if (notice(); as aviso) {
        <p [class]="aviso.error ? 'field-error' : 'field-help'" role="status">{{ aviso.text }}</p>
      }
      <button
        type="button"
        class="btn btn-small btn-danger"
        [disabled]="demo.restoring()"
        [attr.aria-busy]="demo.restoring()"
        (click)="demo.restore()"
      >
        {{ demo.restoring() ? 'Restaurando…' : 'Restaurar demo' }}
      </button>
      <button
        type="button"
        class="btn btn-small"
        [disabled]="adding() || demo.restoring()"
        [attr.aria-busy]="adding()"
        (click)="add()"
      >
        {{ adding() ? 'Añadiendo…' : copy().button }}
      </button>
    </footer>
  `,
  styleUrl: '../../shared/panel/panel.css',
})
export class DemoFootComponent {
  private readonly admin = inject(AdminService);
  readonly demo = inject(DemoRestoreService);

  readonly kind = input.required<DemoKind>();
  /** Tras añadir algo: la sección vuelve a cargar su lista. */
  readonly added = output<void>();

  readonly adding = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);

  copy() {
    return COPY[this.kind()];
  }

  add(): void {
    const copy = this.copy();
    const request: Observable<number> =
      this.kind() === 'sesiones'
        ? this.admin.anadirSesionesDemo().pipe(map(({ creadas }) => creadas.length))
        : this.admin.anadirReservasDemo().pipe(map(({ creadas }) => creadas));
    this.adding.set(true);
    this.notice.set(null);
    request.subscribe({
      next: (count) => {
        this.adding.set(false);
        this.notice.set({ text: count ? `${plural(count, copy.one, copy.many)}.` : copy.none, error: false });
        if (count) {
          this.added.emit();
        }
      },
      error: (error) => {
        this.adding.set(false);
        this.notice.set({ text: errorMessage(error, copy.failure), error: true });
      },
    });
  }
}
