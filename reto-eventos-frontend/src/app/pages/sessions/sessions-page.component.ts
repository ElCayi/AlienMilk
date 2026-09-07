import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { ReservationService } from '../../core/services/reservation.service';
import { anomaly, archiveCode, compatibility, sampleCode, sessionImage } from '../../features/sessions/session.presenter';
import { filterSessions } from '../../features/sessions/session-search';
import { EventoDetalle, EventoListado } from '../../models/api.models';

@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './sessions-page.component.html',
  styleUrl: './sessions-page.component.css',
})
export class SessionsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly reservationService = inject(ReservationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly authService = inject(AuthService);

  readonly sessions = signal<EventoListado[]>([]);
  readonly detail = signal<EventoDetalle | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly query = signal('');
  readonly category = signal('todas');
  readonly loadingSessions = signal(true);
  readonly loadingDetail = signal(false);
  readonly loadingReservation = signal(false);
  readonly listError = signal('');
  readonly detailError = signal('');
  readonly reservationFeedback = signal('');

  cantidad = 1;
  observaciones = '';

  readonly categories = computed(() =>
    [...new Set(this.sessions().map((session) => session.tipoEvento))].sort(),
  );

  readonly filteredSessions = computed(() => {
    return filterSessions(this.sessions(), this.query(), this.category());
  });

  readonly currentUrl = computed(() => {
    const tree = this.router.createUrlTree(['/sesiones'], {
      queryParams: { q: this.query() || null, sesion: this.selectedId() },
    });
    return this.router.serializeUrl(tree);
  });

  readonly sessionImage = sessionImage;
  readonly archiveCode = archiveCode;
  readonly sampleCode = sampleCode;
  readonly compatibility = compatibility;
  readonly anomaly = anomaly;

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.query.set(params.get('q') ?? '');
      const requestedId = Number(params.get('sesion'));
      const nextId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : null;
      if (nextId !== this.selectedId()) {
        this.selectedId.set(nextId);
        if (nextId) {
          this.loadDetail(nextId);
        }
      }
    });

    this.loadSessions();
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    this.listError.set('');
    this.eventService.getActivos().subscribe({
      next: (sessions) => {
        const ordered = [...sessions].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
        this.sessions.set(ordered);
        this.loadingSessions.set(false);
        if (!this.selectedId() && ordered.length) {
          this.selectSession(ordered[0]);
        }
      },
      error: () => {
        this.loadingSessions.set(false);
        this.listError.set('No hemos podido recuperar la programación autorizada.');
      },
    });
  }

  updateQuery(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.query.set(query);
    this.updateUrl({ q: query || null });
  }

  updateCategory(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value);
  }

  selectSession(session: EventoListado): void {
    this.updateUrl({ sesion: session.idEvento });
  }

  reservar(): void {
    const detail = this.detail();
    if (!detail || !this.authService.isAuthenticated()) {
      return;
    }

    this.loadingReservation.set(true);
    this.reservationFeedback.set('');
    this.reservationService.reservar(detail.idEvento, this.cantidad, this.observaciones).subscribe({
      next: () => {
        this.loadingReservation.set(false);
        this.router.navigateByUrl('/reservas');
      },
      error: (error) => {
        this.loadingReservation.set(false);
        this.reservationFeedback.set(
          error?.error?.message ?? 'No se ha podido completar la reserva de plaza.',
        );
      },
    });
  }

  totalReserva(): number {
    return (this.detail()?.precio ?? 0) * Math.max(Number(this.cantidad) || 0, 0);
  }

  trackSession(_index: number, session: EventoListado): number {
    return session.idEvento;
  }

  private loadDetail(idEvento: number): void {
    this.loadingDetail.set(true);
    this.detailError.set('');
    this.detail.set(null);
    this.cantidad = 1;
    this.observaciones = '';
    this.reservationFeedback.set('');

    this.eventService.getDetalle(idEvento).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.loadingDetail.set(false);
        this.detailError.set('El expediente solicitado no está disponible.');
      },
    });
  }

  private updateUrl(queryParams: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: 'q' in queryParams,
    });
  }

}
