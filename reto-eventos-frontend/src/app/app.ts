import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT, NgIf } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { SiteFooterComponent } from './shared/site-footer/site-footer.component';

@Component({
  selector: 'app-root',
  imports: [NgIf, RouterLink, RouterOutlet, SiteFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly authService = inject(AuthService);
  readonly menuOpen = signal(false);
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
      const topbar = this.document.querySelector<HTMLElement>('.topbar');
      const appShell = this.document.querySelector<HTMLElement>('.app-shell');

      if (!topbar || !appShell) {
        return;
      }

      const updateTopbarHeight = () => {
        if (topbar.classList.contains('menu-open')) {
          return;
        }

        appShell.style.setProperty('--topbar-height', `${topbar.offsetHeight}px`);
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

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
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
