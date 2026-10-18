import { Routes } from '@angular/router';

/** Las secciones del panel de administración, cada una en su dirección: /admin/sesiones, /admin/pedidos… */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'resumen' },
  {
    // La visión general: el saludo y un tablero que cada cual elige (ver AdminOverviewPanelComponent).
    path: 'resumen',
    loadComponent: () =>
      import('./panels/admin-overview-panel.component').then((m) => m.AdminOverviewPanelComponent),
  },
  {
    // La hoja de control de ingreso de una sesión, con su parte para sala; también cuelga de Sesiones.
    path: 'sesiones/:id/control',
    loadComponent: () =>
      import('./panels/admin-control-sheet.component').then((m) => m.AdminControlSheetComponent),
  },
  {
    path: 'sesiones',
    loadComponent: () =>
      import('./panels/admin-sessions-panel.component').then((m) => m.AdminSessionsPanelComponent),
  },
  {
    path: 'reservas',
    loadComponent: () =>
      import('./panels/admin-reservations-panel.component').then(
        (m) => m.AdminReservationsPanelComponent,
      ),
  },
  {
    path: 'tipos',
    loadComponent: () =>
      import('./panels/admin-types-panel.component').then((m) => m.AdminTypesPanelComponent),
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./panels/admin-users-panel.component').then((m) => m.AdminUsersPanelComponent),
  },
  {
    path: 'perfiles',
    loadComponent: () =>
      import('./panels/admin-profiles-panel.component').then((m) => m.AdminProfilesPanelComponent),
  },
  {
    path: 'pedidos',
    loadComponent: () =>
      import('./panels/admin-orders-panel.component').then((m) => m.AdminOrdersPanelComponent),
  },
  {
    path: 'solicitudes',
    loadComponent: () =>
      import('./panels/admin-requests-panel.component').then((m) => m.AdminRequestsPanelComponent),
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./panels/admin-contact-panel.component').then((m) => m.AdminContactPanelComponent),
  },
  {
    path: 'demo',
    loadComponent: () =>
      import('./panels/admin-demo-panel.component').then((m) => m.AdminDemoPanelComponent),
  },
  { path: '**', redirectTo: 'sesiones' },
];
