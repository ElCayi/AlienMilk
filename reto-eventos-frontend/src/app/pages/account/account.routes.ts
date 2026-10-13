import { Routes } from '@angular/router';

/** Las secciones de Mi panel: /cuenta/reservas, /cuenta/pedidos y /cuenta/datos. */
export const ACCOUNT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'reservas' },
  {
    path: 'reservas',
    loadComponent: () =>
      import('./panels/account-reservations-panel.component').then(
        (m) => m.AccountReservationsPanelComponent,
      ),
  },
  {
    path: 'pedidos',
    loadComponent: () =>
      import('./panels/account-orders-panel.component').then((m) => m.AccountOrdersPanelComponent),
  },
  {
    path: 'datos',
    loadComponent: () =>
      import('./panels/account-profile-panel.component').then((m) => m.AccountProfilePanelComponent),
  },
  { path: '**', redirectTo: 'reservas' },
];
