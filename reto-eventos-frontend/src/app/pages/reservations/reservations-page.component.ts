import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReservationService } from '../../core/services/reservation.service';
import { Reserva } from '../../models/api.models';

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './reservations-page.component.html',
  styleUrl: './reservations-page.component.css',
})
export class ReservationsPageComponent implements OnInit {
  private readonly reservationService = inject(ReservationService);

  readonly reservas = signal<Reserva[]>([]);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadReservas();
  }

  cancelar(idReserva: number): void {
    this.reservationService.cancelar(idReserva).subscribe({
      next: () => this.loadReservas(),
      error: (err) =>
        this.errorMessage.set(err?.error?.message ?? 'No se ha podido cancelar la reserva.'),
    });
  }

  private loadReservas(): void {
    this.reservationService.getMine().subscribe({
      next: (data) => {
        this.reservas.set(data);
        this.errorMessage.set('');
      },
      error: (err) =>
        this.errorMessage.set(err?.error?.message ?? 'No se han podido cargar tus sesiones reservadas.'),
    });
  }
}
