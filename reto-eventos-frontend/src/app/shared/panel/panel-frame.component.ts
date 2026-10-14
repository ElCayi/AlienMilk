import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { profileLabel } from './panel-format';

export type PanelIcon =
  | 'sesiones'
  | 'reservas'
  | 'tipos'
  | 'usuarios'
  | 'perfiles'
  | 'pedidos'
  | 'solicitudes'
  | 'contacto'
  | 'demo'
  | 'cuenta';

export interface PanelNavItem {
  path: string;
  label: string;
  icon: PanelIcon;
  /** Aviso junto a la etiqueta: lo pendiente (en coral) o lo que sigue en marcha. */
  count?: number;
  /** Coral si pide atención; si no, una burbuja fina. */
  urgent?: boolean;
}

/** Trazos de los iconos, en una rejilla de 24: uno por sección. */
const ICONS: Record<PanelIcon, string> = {
  sesiones: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 3v4M16 3v4M4 10h16',
  reservas:
    'M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4zM14 6v2M14 11v2M14 16v2',
  tipos: 'M3 12V4h8l9 9-8 8zM7.5 6.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2',
  usuarios:
    'M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7',
  perfiles:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 8.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 13h3',
  pedidos: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9',
  solicitudes: 'M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v6H3v-6z',
  contacto: 'M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  cuenta: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0',
  demo: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5M12 8v4l2.5 2.5',
};

/**
 * Marco de los paneles (Mi panel y la administración), que son la aplicación y no la web: barra
 * propia con la marca, la cuenta, «Área pública» y «Cerrar sesión»; menú lateral con las secciones
 * y, al lado, el contenido que pone cada panel. En móvil, el menú es una fila bajo la barra.
 */
@Component({
  selector: 'app-panel-frame',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './panel-frame.component.html',
  styleUrl: './panel-frame.component.css',
})
export class PanelFrameComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** «Mi panel» o «Administración». */
  readonly area = input.required<string>();
  readonly items = input.required<PanelNavItem[]>();
  readonly navLabel = input('Secciones');

  readonly user = this.auth.currentUser;
  readonly initial = computed(() => (this.user()?.nombre ?? '?').trim().charAt(0).toUpperCase());
  readonly role = computed(() => {
    const perfil = this.user()?.perfil;
    return perfil ? profileLabel(perfil) : '';
  });

  icon(name: PanelIcon): string {
    return ICONS[name];
  }

  /** En la fila del móvil, la sección elegida queda a la vista. */
  reveal(event: Event): void {
    (event.currentTarget as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/'], { replaceUrl: true });
  }
}
