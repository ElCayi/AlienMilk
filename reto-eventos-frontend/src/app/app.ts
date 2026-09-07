import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { DOCUMENT, NgIf } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [NgIf, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly authService = inject(AuthService);
  readonly menuOpen = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  constructor() {
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

  private scrollToSection(sectionId: string, smooth = false): void {
    const section = this.document.getElementById(sectionId);
    const topbar = this.document.querySelector<HTMLElement>('.topbar');
    const window = this.document.defaultView;

    if (!section || !window) {
      return;
    }

    const topbarOffset = (topbar?.getBoundingClientRect().height ?? 0) + 16;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      left: 0,
      top: sectionTop - topbarOffset,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  shouldShowFooter(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/' || path === '/login' || path === '/registro';
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
