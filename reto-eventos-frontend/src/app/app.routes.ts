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
  {
    path: 'tienda',
    loadComponent: () =>
      import('./pages/shop/shop-page.component').then(({ ShopPageComponent }) => ShopPageComponent),
  },
  // El pedido de un invitado, con la clave tras la almohadilla; antes que las fichas de producto.
  {
    path: 'tienda/pedido/:referencia',
    loadComponent: () =>
      import('./pages/guest-order/guest-order-page.component').then(
        ({ GuestOrderPageComponent }) => GuestOrderPageComponent,
      ),
  },
  {
    path: 'tienda/:slug',
    loadComponent: () =>
      import('./pages/product/product-page.component').then(
        ({ ProductPageComponent }) => ProductPageComponent,
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
  // Mi panel: las reservas y los pedidos de la cuenta, cada uno en su dirección.
  {
    path: 'cuenta',
    loadComponent: () =>
      import('./pages/account/account-page.component').then(
        ({ AccountPageComponent }) => AccountPageComponent,
      ),
    loadChildren: () => import('./pages/account/account.routes').then(({ ACCOUNT_ROUTES }) => ACCOUNT_ROUTES),
    canActivate: [authGuard],
  },
  // La antigua dirección de «Mis reservas», por si alguien la guardó.
  { path: 'reservas', pathMatch: 'full', redirectTo: 'cuenta/reservas' },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin-page.component').then(
        ({ AdminPageComponent }) => AdminPageComponent,
      ),
    loadChildren: () => import('./pages/admin/admin.routes').then(({ ADMIN_ROUTES }) => ADMIN_ROUTES),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
