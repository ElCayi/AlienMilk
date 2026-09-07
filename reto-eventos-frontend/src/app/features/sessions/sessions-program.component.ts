import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EventoListado } from '../../models/api.models';
import {
  anomaly,
  archiveCode,
  compatibility,
  sampleCode,
  sessionImage,
} from './session.presenter';

@Component({
  selector: 'app-sessions-program',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sessions-program.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsProgramComponent {
  private readonly router = inject(Router);
  @Input({ required: true }) sessions: EventoListado[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Output() readonly retry = new EventEmitter<void>();
  readonly query = signal('');

  readonly sessionImage = sessionImage;
  readonly archiveCode = archiveCode;
  readonly sampleCode = sampleCode;
  readonly compatibility = compatibility;
  readonly anomaly = anomaly;

  get featuredSession(): EventoListado | null {
    return this.sessions[0] ?? null;
  }

  get secondarySessions(): EventoListado[] {
    return this.sessions.slice(1, 3);
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
