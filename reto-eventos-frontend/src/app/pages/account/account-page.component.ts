import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PanelConfirmComponent } from '../../shared/panel/panel-confirm';
import { PanelFrameComponent, PanelNavItem } from '../../shared/panel/panel-frame.component';
import { AccountStore } from './account-store';

/**
 * Mi panel: las reservas de sesiones, los pedidos de la tienda y la cuenta, cada uno en su sección
 * (ver account.routes.ts), dentro del mismo marco de aplicación que la administración.
 */
@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [RouterLink, RouterOutlet, PanelConfirmComponent, PanelFrameComponent],
  templateUrl: './account-page.component.html',
  styleUrl: '../../shared/panel/panel-shell.css',
  providers: [AccountStore],
})
export class AccountPageComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly store = inject(AccountStore);

  /** Las secciones, con lo que sigue en marcha como aviso. */
  readonly navItems = computed<PanelNavItem[]>(() => [
    { path: 'reservas', label: 'Reservas', icon: 'reservas', count: this.store.activeReservations() },
    { path: 'pedidos', label: 'Pedidos', icon: 'pedidos', count: this.store.ordersInProgress() },
    { path: 'datos', label: 'Mi cuenta', icon: 'cuenta' },
  ]);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly section = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return path.endsWith('/pedidos') ? 'Pedidos' : path.endsWith('/datos') ? 'Mi cuenta' : 'Reservas';
  });

  readonly name = computed(() => this.auth.currentUser()?.nombre ?? '');

  constructor() {
    this.store.loadReservations();
    this.store.loadOrders();
  }
}
