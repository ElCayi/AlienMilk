import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

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
    return this.filteredSessions[0] ?? null;
  }

  get secondarySessions(): EventoListado[] {
    return this.filteredSessions.slice(1, 3);
  }

  get filteredSessions(): EventoListado[] {
    const query = this.normalize(this.query());
    if (!query) {
      return this.sessions;
    }

    return this.sessions.filter((session) =>
      this.normalize(`${session.nombre} ${session.tipoEvento} ${session.fechaInicio}`).includes(query),
    );
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  trackSession(_index: number, session: EventoListado): number {
    return session.idEvento;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
