import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PanelConfirmComponent } from '../../shared/panel/panel-confirm';
import { PanelFrameComponent, PanelNavItem } from '../../shared/panel/panel-frame.component';
import { AdminSummaryService } from './admin-summary.service';

const SECTIONS: PanelNavItem[] = [
  { path: 'sesiones', label: 'Sesiones', icon: 'sesiones' },
  { path: 'reservas', label: 'Reservas', icon: 'reservas' },
  { path: 'tipos', label: 'Tipos de sesión', icon: 'tipos' },
  { path: 'usuarios', label: 'Usuarios', icon: 'usuarios' },
  { path: 'perfiles', label: 'Perfiles', icon: 'perfiles' },
  { path: 'pedidos', label: 'Pedidos', icon: 'pedidos' },
  { path: 'solicitudes', label: 'Solicitudes', icon: 'solicitudes' },
  { path: 'contacto', label: 'Contacto', icon: 'contacto' },
];

/**
 * Panel de administración: el marco de la aplicación (barra y menú lateral), el saludo con el
 * resumen y, debajo, la sección abierta (cada una en su dirección, ver admin.routes.ts).
 */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, RouterOutlet, PanelConfirmComponent, PanelFrameComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: '../../shared/panel/panel-shell.css',
})
export class AdminPageComponent {
  private readonly router = inject(Router);
  private readonly summaryService = inject(AdminSummaryService);
  private readonly auth = inject(AuthService);

  readonly summary = this.summaryService.summary;
  readonly name = computed(() => this.auth.currentUser()?.nombre ?? '');

  /** Las secciones, con lo pendiente de pedidos y solicitudes como aviso. */
  readonly navItems = computed<PanelNavItem[]>(() => {
    const summary = this.summary();
    return SECTIONS.map((item) => {
      const count =
        item.path === 'pedidos'
          ? summary?.pedidosPorPreparar
          : item.path === 'solicitudes'
            ? summary?.solicitudesNuevas
            : undefined;
      return count ? { ...item, count, urgent: true } : item;
    });
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** La sección abierta, para el rótulo de la cabecera. */
  readonly current = computed(() => {
    const path = this.url().split(/[?#]/)[0].split('/')[2] ?? '';
    return SECTIONS.find((section) => section.path === path) ?? SECTIONS[0];
  });

  constructor() {
    this.summaryService.refresh();
  }

  /** Una cifra del resumen, o un guion mientras llega (o si no llega). */
  figure(value: number | undefined): string {
    return value === undefined ? '—' : new Intl.NumberFormat('es-ES').format(value);
  }
}
