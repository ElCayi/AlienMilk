import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PanelConfirmComponent } from '../../shared/panel/panel-confirm';
import { AccountStore } from './account-store';

/**
 * Mi panel: las reservas de sesiones y los pedidos de la tienda de la cuenta, cada uno en su
 * pestaña (ver account.routes.ts). Mismo armazón que el panel de administración, en pequeño.
 */
@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PanelConfirmComponent],
  templateUrl: './account-page.component.html',
  styleUrls: [
    '../../shared/secondary-page/secondary-page.css',
    '../../shared/panel/panel-shell.css',
    './account-page.component.css',
  ],
  providers: [AccountStore],
})
export class AccountPageComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly store = inject(AccountStore);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly section = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return path.endsWith('/pedidos') ? 'Pedidos' : path.endsWith('/datos') ? 'Cuenta' : 'Reservas';
  });

  /** El nombre de la cuenta; si aún no ha llegado, sin saludo. */
  readonly name = computed(() => this.auth.currentUser()?.nombre ?? '');

  constructor() {
    this.store.loadReservations();
    this.store.loadOrders();
  }
}
