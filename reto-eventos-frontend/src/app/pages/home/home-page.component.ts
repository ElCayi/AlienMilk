import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EventoListado } from '../../models/api.models';
import { Estacion } from '../../models/station.models';
import { EventService } from '../../core/services/event.service';
import { StationService } from '../../core/services/station.service';
import { LiquidVideoDirective } from '../../features/ambient/liquid-video.directive';
import { LiquidBackdropComponent } from '../../features/ambient/liquid-backdrop.component';
import { LocationsAtlasComponent } from '../../features/locations/locations-atlas.component';
import { SessionsProgramComponent } from '../../features/sessions/sessions-program.component';
import { ClosingCtaComponent } from '../../shared/closing-cta/closing-cta.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LiquidBackdropComponent,
    LiquidVideoDirective,
    SessionsProgramComponent,
    LocationsAtlasComponent,
    ClosingCtaComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css', './styles/home-session-dossier.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HomePageComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly stationService = inject(StationService);

  readonly sessions = signal<EventoListado[]>([]);
  readonly stations = signal<Estacion[]>([]);
  readonly loadingStations = signal(true);
  readonly loadingSessions = signal(true);
  readonly sessionsError = signal('');
  readonly isFavorite = signal(localStorage.getItem('alienmilk-favorite') === 'true');
  readonly actionFeedback = signal('');
  private feedbackTimer: number | undefined;

  ngOnInit(): void {
    this.loadSessions();
    this.loadStations();
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
      },
      error: () => {
        this.sessions.set([]);
        this.sessionsError.set('No hemos podido cargar las sesiones disponibles.');
        this.loadingSessions.set(false);
      },
    });
  }

  // Las estaciones describen los espacios de la red, no las sesiones: se cargan aparte de ellas.
  private loadStations(): void {
    this.stationService.getEstaciones().subscribe({
      next: (stations) => {
        this.stations.set(stations);
        this.loadingStations.set(false);
      },
      error: () => {
        this.stations.set([]);
        this.loadingStations.set(false);
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
