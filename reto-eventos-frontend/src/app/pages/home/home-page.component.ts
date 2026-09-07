import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventoListado } from '../../models/api.models';
import { EventService } from '../../core/services/event.service';
import { SessionsProgramComponent } from '../../features/sessions/sessions-program.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, SessionsProgramComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class HomePageComponent implements OnInit {
  private readonly eventService = inject(EventService);

  readonly sessions = signal<EventoListado[]>([]);
  readonly loadingSessions = signal(true);
  readonly sessionsError = signal('');
  readonly isFavorite = signal(localStorage.getItem('alienmilk-favorite') === 'true');
  readonly actionFeedback = signal('');
  private feedbackTimer: number | undefined;

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    this.sessionsError.set('');

    this.eventService.getActivos().subscribe({
      next: (sessions) => {
        this.sessions.set(
          [...sessions].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
        );
        this.loadingSessions.set(false);
      },
      error: () => {
        this.sessions.set([]);
        this.sessionsError.set('No hemos podido cargar las sesiones disponibles.');
        this.loadingSessions.set(false);
      },
    });
  }

  async sharePage(): Promise<void> {
    const shareData = {
      title: 'AlienMilk Sessions',
      text: 'Descubre las experiencias sensoriales de AlienMilk Sessions.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        this.showActionFeedback('Compartido');
      } catch (error) {
        if (error instanceof DOMException && error.name !== 'AbortError') {
          this.showActionFeedback('No se ha podido compartir');
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      this.showActionFeedback('Enlace copiado');
    } catch {
      this.showActionFeedback('No se ha podido copiar el enlace');
    }
  }

  toggleFavorite(): void {
    const nextValue = !this.isFavorite();
    this.isFavorite.set(nextValue);
    localStorage.setItem('alienmilk-favorite', String(nextValue));
    this.showActionFeedback(nextValue ? 'Guardado en favoritos' : 'Eliminado de favoritos');
  }

  private showActionFeedback(message: string): void {
    this.actionFeedback.set(message);
    window.clearTimeout(this.feedbackTimer);
    this.feedbackTimer = window.setTimeout(() => this.actionFeedback.set(''), 2200);
  }
}
