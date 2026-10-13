import { afterNextRender, Component, DestroyRef, inject, isDevMode, signal } from '@angular/core';
import { DOCUMENT, NgIf } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { CartService } from './features/shop/cart.service';
import { startFitControls } from './shared/fit-controls/fit-controls';
import { SiteFooterComponent } from './shared/site-footer/site-footer.component';

/** Una entrada del desplegable: sin `fragment`, lleva al principio de la página. */
interface NavSection {
  label: string;
  fragment?: string;
}

/** Cada página del menú con sus secciones, para ir directamente a ellas desde cualquier sitio. */
interface NavGroup {
  label: string;
  path: string;
  sections: readonly NavSection[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Inicio',
    path: '/',
    sections: [
      { label: 'Próximas sesiones', fragment: 'sesiones' },
      { label: 'AlienMilk Distribution', fragment: 'distribution' },
      { label: 'AlienMilk Collaborators', fragment: 'collaborators' },
      { label: 'En buenas manos', fragment: 'confianza' },
    ],
  },
  {
    label: 'Sesiones',
    path: '/sesiones',
    sections: [{ label: 'Programación de experiencias' }],
  },
  {
    label: 'Nosotros',
    path: '/nosotros',
    sections: [
      { label: 'Una institución dedicada a lo que nos une' },
      { label: 'Nuestro campo', fragment: 'campo' },
      { label: 'Nuestro trabajo', fragment: 'trabajo' },
      { label: 'El ecosistema', fragment: 'ecosistema' },
      { label: 'Nuestra organización', fragment: 'organizacion' },
    ],
  },
  {
    label: 'Tienda',
    path: '/tienda',
    sections: [
      { label: 'Tienda' },
      { label: 'Catálogo', fragment: 'catalogo' },
      { label: 'Su pedido', fragment: 'su-pedido' },
    ],
  },
  {
    label: 'Contacto',
    path: '/contacto',
    sections: [
      { label: 'Contacto' },
      { label: 'Atención y consultas', fragment: 'atencion' },
      { label: 'Visitar la sede', fragment: 'visita' },
      { label: 'AlienMilk Collaborators', fragment: 'collaborators' },
      { label: 'Antes de escribir', fragment: 'preguntas' },
    ],
  },
];

@Component({
  selector: 'app-root',
  imports: [NgIf, RouterLink, RouterOutlet, SiteFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly authService = inject(AuthService);
  /** Pedido en curso de la tienda: el menú muestra cuántas unidades lleva. */
  readonly cart = inject(CartService);
  readonly menuOpen = signal(false);
  readonly navGroups = NAV_GROUPS;
  /** En el menú de móvil, la página con las secciones desplegadas. */
  readonly openGroup = signal<string | null>(null);
  /** Tras elegir una sección, su desplegable se cierra aunque el ratón siga encima. */
  readonly dismissedGroup = signal<string | null>(null);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  /** Sección pedida desde el menú: goToSection ya se encarga de llevar a ella con suavidad. */
  private menuSection: string | null = null;

  constructor() {
    // Enlaces a una sección de la portada desde otra página (la ruta de navegación de un operador
    // lleva a «/#operadores-asociados»): el router tiene desactivado el salto a fragmentos.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof NavigationEnd)) {
        return;
      }

      const section = this.router.parseUrl(event.urlAfterRedirects).fragment;
      if (section && section !== this.menuSection) {
        setTimeout(() => this.followSection(section));
      }
      this.menuSection = null;
    });

    afterNextRender(() => {
      // Ningún botón parte su rótulo en dos líneas ni se sale de su caja: si no cabe, encoge.
      const stopFitControls = startFitControls(this.document);
      this.destroyRef.onDestroy(stopFitControls);

      // La regla de medir (shared/dev-ruler), solo en desarrollo y en su propio trozo, que en
      // producción nunca se descarga. Se enciende con «?regla» en la dirección.
      if (isDevMode()) {
        let stopRuler: (() => void) | null = null;
        let destroyed = false;
        this.destroyRef.onDestroy(() => {
          destroyed = true;
          stopRuler?.();
        });
        void import('./shared/dev-ruler/dev-ruler').then(({ startDevRuler }) => {
          if (!destroyed) {
            stopRuler = startDevRuler(this.document);
          }
        });
      }

      const topbar = this.document.querySelector<HTMLElement>('.topbar');
      const appShell = this.document.querySelector<HTMLElement>('.app-shell');

      if (!topbar || !appShell) {
        return;
      }

      let closedHeight = topbar.offsetHeight;
      const updateTopbarHeight = () => {
        // El menú desplegado se abre por encima de la página: lo que crece el header se le resta
        // por debajo (app.css, --menu-overlap), así no empuja nada.
        if (topbar.classList.contains('menu-open')) {
          topbar.style.setProperty('--menu-overlap', `${topbar.offsetHeight - closedHeight}px`);
          return;
        }

        topbar.style.removeProperty('--menu-overlap');
        closedHeight = topbar.offsetHeight;
        appShell.style.setProperty('--topbar-height', `${closedHeight}px`);
      };
      const resizeObserver = new ResizeObserver(updateTopbarHeight);

      resizeObserver.observe(topbar);
      updateTopbarHeight();
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());

      const initialSection = this.document.defaultView?.location.hash.slice(1);
      if (initialSection) {
        setTimeout(() => this.scrollToSection(decodeURIComponent(initialSection)));
      }
    });

    this.authService.loadSession()?.subscribe();
  }

  goToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.closeMenu();
    this.menuSection = sectionId;

    this.router.navigate(['/'], { fragment: sectionId }).then(() => {
      setTimeout(() => this.scrollToSection(sectionId, true));
    });
  }

  /**
   * Una sección del desplegable, en cualquier página. Sin fragmento, el principio de la página. Si
   * ya se está en ella, el router no navega y solo se desplaza.
   */
  goTo(event: MouseEvent, group: NavGroup, section: NavSection): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.closeMenu();
    this.dismissedGroup.set(group.path);
    (this.document.activeElement as HTMLElement | null)?.blur();

    const fragment = section.fragment;
    this.menuSection = fragment ?? null;
    this.router.navigate([group.path], fragment ? { fragment } : {}).then(() => {
      setTimeout(() => {
        if (fragment) {
          this.followSection(fragment);
        } else {
          this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  /** El enlace que lleva cada entrada, para abrirla en otra pestaña o copiarla. */
  sectionHref(group: NavGroup, section: NavSection): string {
    return section.fragment ? `${group.path}#${section.fragment}` : group.path;
  }

  toggleGroup(path: string): void {
    this.openGroup.update((open) => (open === path ? null : path));
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.openGroup.set(null);
  }

  /**
   * Lleva a la sección, centrada, y la sigue mientras la portada termina de cargar: las sesiones y
   * las localizaciones llegan después y empujan hacia abajo lo que hay debajo. Se deja de seguir a
   * los tres segundos o en cuanto el usuario desplaza la página por su cuenta.
   */
  private followSection(sectionId: string): void {
    const window = this.document.defaultView;
    const body = this.document.body;
    if (!window) {
      return;
    }

    this.scrollToSection(sectionId, false, true);
    const observer = new ResizeObserver(() => this.scrollToSection(sectionId, false, true));
    const stop = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      for (const type of ['wheel', 'touchstart', 'keydown']) {
        window.removeEventListener(type, stop);
      }
    };
    const timer = window.setTimeout(stop, 3000);

    observer.observe(body);
    for (const type of ['wheel', 'touchstart', 'keydown']) {
      window.addEventListener(type, stop, { passive: true });
    }
  }

  /**
   * Con `centered`, la sección queda centrada en el hueco bajo la barra superior. Si está dentro de
   * un bloque marcado con `data-scroll-frame` que cabe en ese hueco, se centra el bloque entero;
   * si la sección no cabe, se alinea arriba como el resto.
   */
  private scrollToSection(sectionId: string, smooth = false, centered = false): void {
    const section = this.document.getElementById(sectionId);
    const topbar = this.document.querySelector<HTMLElement>('.topbar');
    const window = this.document.defaultView;

    if (!section || !window) {
      return;
    }

    const topbarHeight = topbar?.getBoundingClientRect().height ?? 0;
    const available = window.innerHeight - topbarHeight;
    const frame = section.closest<HTMLElement>('[data-scroll-frame]');
    const target =
      centered && frame && frame.getBoundingClientRect().height <= available ? frame : section;
    const box = target.getBoundingClientRect();
    const top =
      centered && box.height <= available
        ? box.top + window.scrollY - topbarHeight - (available - box.height) / 2
        : box.top + window.scrollY - topbarHeight - 16;

    window.scrollTo({
      left: 0,
      top,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  /** El pie es común a toda la web salvo el área de administración, que es una herramienta. */
  shouldShowFooter(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return !path.startsWith('/admin');
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
