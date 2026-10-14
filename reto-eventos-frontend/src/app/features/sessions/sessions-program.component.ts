import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventoListado } from '../../models/api.models';
import { humanizeSessionType } from './session-dossier';
import { anomaly, archiveCode, compatibility, sampleCode, sessionImage } from './session.presenter';

interface ViewTransitionDocument {
  startViewTransition?: (update: () => void) => ViewTransition;
}

@Component({
  selector: 'app-sessions-program',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sessions-program.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsProgramComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private activeTransition: ViewTransition | null = null;
  @Input({ required: true }) sessions: EventoListado[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() readonly retry = new EventEmitter<void>();
  readonly featuredSessionIndex = signal(0);
  /** Ficha de las sesiones desplegada (solo en móvil, donde llega plegada). */
  readonly specsOpen = signal(false);
  private readonly sessionsTrack = viewChild<ElementRef<HTMLElement>>('sessionsTrack');

  readonly sessionImage = sessionImage;
  readonly archiveCode = archiveCode;
  readonly sampleCode = sampleCode;
  readonly compatibility = compatibility;
  readonly anomaly = anomaly;
  readonly typeLabel = humanizeSessionType;

  get featuredSession(): EventoListado | null {
    if (!this.sessions.length) {
      return null;
    }

    return this.sessions[this.featuredSessionIndex() % this.sessions.length] ?? null;
  }

  get secondarySessions(): EventoListado[] {
    const featuredId = this.featuredSession?.idEvento;
    return this.sessions.filter((session) => session.idEvento !== featuredId).slice(0, 2);
  }

  get hasMultipleSessions(): boolean {
    return this.sessions.length > 1;
  }

  previousSession(): void {
    this.changeFeaturedSession(-1);
  }

  nextSession(): void {
    this.changeFeaturedSession(1);
  }

  /** Lleva la pista de fichas de móvil a la sesión elegida en los puntos. */
  showMobileSession(index: number): void {
    const track = this.sessionsTrack()?.nativeElement;
    const cards = track ? [...track.children] as HTMLElement[] : [];
    if (!track || !cards[index]) {
      return;
    }

    track.scrollTo({
      left: cards[index].offsetLeft - cards[0].offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  /**
   * Abre o cierra las características. Al abrirlas, la página baja lo justo para que se vea la ficha
   * entera hasta el precio, sin que el botón se esconda bajo la barra de arriba.
   */
  toggleSpecs(event: MouseEvent): void {
    const opening = !this.specsOpen();
    this.specsOpen.set(opening);
    const toggle = event.currentTarget as HTMLElement;
    const card = toggle.closest<HTMLElement>('.session-featured');
    if (!opening || !card) {
      return;
    }

    this.changeDetector.detectChanges();
    requestAnimationFrame(() => {
      const air = 16;
      const topbar = document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 0;
      const overflow = card.getBoundingClientRect().bottom + air - window.innerHeight;
      const room = toggle.getBoundingClientRect().top - topbar - air;
      const distance = Math.min(overflow, room);
      if (distance > 0) {
        window.scrollBy({
          top: distance,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
      }
    });
  }

  goToSession(session: EventoListado): void {
    const sessionIndex = this.sessions.findIndex((item) => item.idEvento === session.idEvento);
    if (sessionIndex < 0 || sessionIndex === this.featuredSessionIndex()) {
      return;
    }

    this.setFeaturedSession(sessionIndex);
  }

  private changeFeaturedSession(offset: number): void {
    if (!this.sessions.length) {
      return;
    }

    const nextIndex =
      (this.featuredSessionIndex() + offset + this.sessions.length) % this.sessions.length;
    this.setFeaturedSession(nextIndex);
  }

  private setFeaturedSession(index: number): void {
    const updateFeaturedSession = () => {
      this.featuredSessionIndex.set(index);
      this.changeDetector.detectChanges();
      this.bounceFrames();
    };

    const transitionDocument = document as unknown as ViewTransitionDocument;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updateFeaturedSession();
      return;
    }

    if (transitionDocument.startViewTransition) {
      this.activeTransition?.skipTransition();
      const transition = transitionDocument.startViewTransition.call(
        document,
        updateFeaturedSession,
      );
      this.activeTransition = transition;
      void transition.finished.finally(() => {
        if (this.activeTransition === transition) {
          this.activeTransition = null;
        }
      });
    } else {
      updateFeaturedSession();
    }
  }

  // Los marcos laten al cambiar la destacada (animación en home-session-dossier.css). Quitar la
  // clase y forzar un reflow reinicia la animación aunque se pulse otra vez a mitad.
  private bounceFrames(): void {
    const element = this.host.nativeElement;
    element.classList.remove('is-swapping');
    void element.offsetWidth;
    element.classList.add('is-swapping');
  }

  trackSession(_index: number, session: EventoListado): number {
    return session.idEvento;
  }
}
