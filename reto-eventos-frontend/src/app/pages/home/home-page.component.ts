import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { EventoDetalle, EventoListado } from '../../models/api.models';
import { EventService } from '../../core/services/event.service';
import { LocationsAtlasComponent } from '../../features/locations/locations-atlas.component';
import { SessionsProgramComponent } from '../../features/sessions/sessions-program.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, SessionsProgramComponent, LocationsAtlasComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class HomePageComponent implements OnInit {
  private readonly eventService = inject(EventService);

  readonly sessions = signal<EventoListado[]>([]);
  readonly sessionLocations = signal<EventoDetalle[]>([]);
  readonly loadingLocations = signal(true);
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
        const upcomingSessions = [...sessions].sort((a, b) =>
          a.fechaInicio.localeCompare(b.fechaInicio),
        );
        this.sessions.set(upcomingSessions);
        this.loadingSessions.set(false);
        this.loadLocations(upcomingSessions);
      },
      error: () => {
        this.sessions.set([]);
        this.sessionLocations.set([]);
        this.sessionsError.set('No hemos podido cargar las sesiones disponibles.');
        this.loadingSessions.set(false);
        this.loadingLocations.set(false);
      },
    });
  }

  private loadLocations(sessions: EventoListado[]): void {
    const requests = sessions.slice(0, 3).map((session) =>
      this.eventService.getDetalle(session.idEvento).pipe(catchError(() => of(null))),
    );

    if (!requests.length) {
      this.sessionLocations.set([]);
      this.loadingLocations.set(false);
      return;
    }

    this.loadingLocations.set(true);
    forkJoin(requests).subscribe((locations) => {
      this.sessionLocations.set(locations.filter((location): location is EventoDetalle => location !== null));
      this.loadingLocations.set(false);
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
