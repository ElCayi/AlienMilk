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
import {
  anomaly,
  archiveCode,
  compatibility,
  sampleCode,
  sessionImage,
} from './session.presenter';

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
  readonly featuredSessionId = signal<number | null>(null);

  readonly sessionImage = sessionImage;
  readonly archiveCode = archiveCode;
  readonly sampleCode = sampleCode;
  readonly compatibility = compatibility;
  readonly anomaly = anomaly;

  get featuredSession(): EventoListado | null {
    return this.displaySessions[0] ?? null;
  }

  get secondarySessions(): EventoListado[] {
    return this.displaySessions.slice(1);
  }

  private get displaySessions(): EventoListado[] {
    const visibleSessions = this.sessions.slice(0, 3);
    const selectedIndex = visibleSessions.findIndex(
      (session) => session.idEvento === this.featuredSessionId(),
    );

    if (selectedIndex > 0) {
      [visibleSessions[0], visibleSessions[selectedIndex]] = [
        visibleSessions[selectedIndex],
        visibleSessions[0],
      ];
    }

    return visibleSessions;
  }

  promoteSession(session: EventoListado): void {
    if (session.idEvento === this.featuredSession?.idEvento) {
      return;
    }

    const updateFeaturedSession = () => {
      this.featuredSessionId.set(session.idEvento);
      this.changeDetector.detectChanges();
    };
    const transitionDocument = document as unknown as ViewTransitionDocument;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updateFeaturedSession();
      return;
    }

    if (transitionDocument.startViewTransition) {
      this.activeTransition?.skipTransition();
      const transition = transitionDocument.startViewTransition.call(document, updateFeaturedSession);
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
