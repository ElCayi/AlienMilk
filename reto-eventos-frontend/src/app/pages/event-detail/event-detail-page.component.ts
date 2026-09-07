import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { ReservationService } from '../../core/services/reservation.service';
import { EventoDetalle } from '../../models/api.models';

@Component({
  selector: 'app-event-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './event-detail-page.component.html',
  styleUrl: './event-detail-page.component.css',
})
export class EventDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly reservationService = inject(ReservationService);
  readonly authService = inject(AuthService);

  readonly evento = signal<EventoDetalle | null>(null);
  readonly loadingDetalle = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  cantidad = 1;
  observaciones = '';
  currentUrl = '';

  ngOnInit(): void {
    this.currentUrl = this.router.url;
    const idEvento = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      this.loadingDetalle.set(false);
      this.errorMessage.set('El identificador del evento no es valido.');
      return;
    }

    this.loadingDetalle.set(true);
    this.errorMessage.set('');
    this.evento.set(null);

    this.eventService.getDetalle(idEvento).subscribe({
      next: (data) => {
        this.evento.set(data);
        this.loadingDetalle.set(false);
      },
      error: (err) => {
        this.loadingDetalle.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se ha podido cargar el detalle de la sesion.');
      },
    });
  }

  reservar(): void {
    const evento = this.evento();
    if (!evento) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.reservationService.reservar(evento.idEvento, this.cantidad, this.observaciones).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/reservas');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se ha podido completar la reserva de plaza.');
      },
    });
  }

  totalReserva(): number {
    const evento = this.evento();
    if (!evento) {
      return 0;
    }

    const plazas = Number.isFinite(this.cantidad) ? this.cantidad : 0;
    return evento.precio * Math.max(plazas, 0);
  }
}
