import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { HomePageComponent } from './pages/home/home-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  {
    path: 'sesiones',
    loadComponent: () =>
      import('./pages/sessions/sessions-page.component').then(
        ({ SessionsPageComponent }) => SessionsPageComponent,
      ),
  },
  {
    path: 'nosotros',
    loadComponent: () =>
      import('./pages/about/about-page.component').then(
        ({ AboutPageComponent }) => AboutPageComponent,
      ),
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./pages/contact/contact-page.component').then(
        ({ ContactPageComponent }) => ContactPageComponent,
      ),
  },
  // Una ruta por operador asociado: una dirección desconocida cae en la redirección final.
  ...['am-transit', 'helix-transfer', 'kepler-liaison'].map((operator) => ({
    path: `operadores/${operator}`,
    data: { operator },
    loadComponent: () =>
      import('./pages/operator/operator-page.component').then(
        ({ OperatorPageComponent }) => OperatorPageComponent,
      ),
  })),
  {
    path: 'documentacion/asistentes',
    loadComponent: () =>
      import('./pages/documentation/documentation-page.component').then(
        ({ DocumentationPageComponent }) => DocumentationPageComponent,
      ),
  },
  ...[
    ['aviso-legal', 'Aviso legal'],
    ['privacidad', 'Política de privacidad'],
    ['cookies', 'Política de cookies'],
  ].map(([path, title]) => ({
    path,
    data: { title },
    loadComponent: () =>
      import('./pages/legal/legal-page.component').then(
        ({ LegalPageComponent }) => LegalPageComponent,
      ),
  })),
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login-page.component').then(
        ({ LoginPageComponent }) => LoginPageComponent,
      ),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/register/register-page.component').then(
        ({ RegisterPageComponent }) => RegisterPageComponent,
      ),
  },
  {
    path: 'eventos/:id',
    loadComponent: () =>
      import('./pages/event-detail/event-detail-page.component').then(
        ({ EventDetailPageComponent }) => EventDetailPageComponent,
      ),
  },
  {
    path: 'reservas',
    loadComponent: () =>
      import('./pages/reservations/reservations-page.component').then(
        ({ ReservationsPageComponent }) => ReservationsPageComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin-page.component').then(
        ({ AdminPageComponent }) => AdminPageComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/reservas',
    loadComponent: () =>
      import('./pages/admin-reservations/admin-reservations-page.component').then(
        ({ AdminReservationsPageComponent }) => AdminReservationsPageComponent,
      ),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
