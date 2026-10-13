import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PanelConfirmComponent } from '../../shared/panel/panel-confirm';
import { AdminSummaryService } from './admin-summary.service';

interface AdminSection {
  path: string;
  label: string;
  /** Avisos de la pestaña: lo que espera a alguien. */
  pending?: 'pedidosPorPreparar' | 'solicitudesNuevas';
}

/**
 * Armazón del panel de administración: la cabecera con el resumen, las pestañas de las secciones y,
 * debajo, la sección abierta (cada una en su dirección, ver admin.routes.ts).
 */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PanelConfirmComponent],
  templateUrl: './admin-page.component.html',
  styleUrls: [
    '../../shared/secondary-page/secondary-page.css',
    '../../shared/panel/panel-shell.css',
  ],
})
export class AdminPageComponent {
  private readonly router = inject(Router);
  private readonly summaryService = inject(AdminSummaryService);
  readonly auth = inject(AuthService);

  readonly summary = this.summaryService.summary;

  readonly sections: AdminSection[] = [
    { path: 'sesiones', label: 'Sesiones' },
    { path: 'reservas', label: 'Reservas' },
    { path: 'tipos', label: 'Tipos' },
    { path: 'usuarios', label: 'Usuarios' },
    { path: 'perfiles', label: 'Perfiles' },
    { path: 'pedidos', label: 'Pedidos', pending: 'pedidosPorPreparar' },
    { path: 'solicitudes', label: 'Solicitudes', pending: 'solicitudesNuevas' },
    { path: 'contacto', label: 'Contacto' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** La sección abierta, para la ruta de navegación. */
  readonly current = computed(() => {
    const path = this.url().split(/[?#]/)[0].split('/')[2] ?? '';
    return this.sections.find((section) => section.path === path) ?? this.sections[0];
  });

  constructor() {
    this.summaryService.refresh();
  }

  pendingCount(section: AdminSection): number {
    const summary = this.summary();
    return section.pending && summary ? summary[section.pending] : 0;
  }

  /** Una cifra del resumen, o un guion mientras llega (o si no llega). */
  figure(value: number | undefined): string {
    return value === undefined ? '—' : new Intl.NumberFormat('es-ES').format(value);
  }

  /** Al cambiar de pestaña con el teclado o el ratón, la abierta queda a la vista si la fila se desplaza. */
  reveal(event: Event): void {
    (event.currentTarget as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
