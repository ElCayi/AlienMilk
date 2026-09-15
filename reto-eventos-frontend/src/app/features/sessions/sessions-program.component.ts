import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EventoListado } from '../../models/api.models';
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
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private activeTransition: ViewTransition | null = null;
  @Input({ required: true }) sessions: EventoListado[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() readonly retry = new EventEmitter<void>();
  readonly query = signal('');
  readonly featuredSessionIndex = signal(0);

  readonly sessionImage = sessionImage;
  readonly archiveCode = archiveCode;
  readonly sampleCode = sampleCode;
  readonly compatibility = compatibility;
  readonly anomaly = anomaly;

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

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  openProgram(): void {
    this.router.navigate(['/sesiones'], {
      queryParams: { q: this.query().trim() || null },
    });
  }

  trackSession(_index: number, session: EventoListado): number {
    return session.idEvento;
  }
}
