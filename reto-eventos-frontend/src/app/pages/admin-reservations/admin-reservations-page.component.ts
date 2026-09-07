import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminService } from '../../core/services/admin.service';
import { EventoListado, Reserva, Usuario } from '../../models/api.models';

@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './admin-reservations-page.component.html',
  styleUrl: './admin-reservations-page.component.css',
})
export class AdminReservationsPageComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly usuarios = signal<Usuario[]>([]);
  readonly eventosActivos = signal<EventoListado[]>([]);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);
  readonly reservas = signal<Reserva[]>([]);
  readonly feedback = signal('');
  readonly esError = signal(false);

  filtro = '';
  nuevaReserva = { idEvento: 0, cantidad: 1, observaciones: '' };

  readonly usuariosFiltrados = computed(() => {
    const q = this.filtro.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.usuarios().filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.nombre.toLowerCase().includes(q) ||
        (u.apellidos ?? '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.adminService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cdr.markForCheck();
      },
    });
    this.adminService.getEventos().subscribe({
      next: (data) => {
        this.eventosActivos.set(data.filter((e) => e.estado === 'ACTIVO'));
        this.cdr.markForCheck();
      },
    });
  }

  onFiltroChange(): void {
    // computed reacciona automaticamente; nada que hacer aqui
  }

  seleccionarUsuario(u: Usuario): void {
    this.usuarioSeleccionado.set(u);
    this.cargarReservas(u.username);
    this.nuevaReserva = { idEvento: 0, cantidad: 1, observaciones: '' };
    this.feedback.set('');
  }

  private cargarReservas(username: string): void {
    this.adminService.getReservasUsuario(username).subscribe({
      next: (data) => {
        this.reservas.set(data);
        this.cdr.markForCheck();
      },
      error: (err) => this.mostrarError(err, 'No se han podido cargar las reservas.'),
    });
  }

  cancelarReserva(idReserva: number): void {
    if (!confirm('¿Cancelar esta reserva?')) {
      return;
    }
    this.adminService.cancelarReservaAdmin(idReserva).subscribe({
      next: () => {
        this.feedback.set('Reserva cancelada.');
        this.esError.set(false);
        const user = this.usuarioSeleccionado();
        if (user) {
          this.cargarReservas(user.username);
        }
      },
      error: (err) => this.mostrarError(err, 'No se ha podido cancelar la reserva.'),
    });
  }

  crearReserva(): void {
    const user = this.usuarioSeleccionado();
    if (!user || !this.nuevaReserva.idEvento) {
      this.mostrarMensaje('Selecciona un usuario y una sesion antes de crear la reserva.', true);
      return;
    }
    this.adminService
      .crearReservaParaUsuario(user.username, this.nuevaReserva.idEvento, {
        cantidad: this.nuevaReserva.cantidad,
        observaciones: this.nuevaReserva.observaciones,
      })
      .subscribe({
        next: () => {
          this.mostrarMensaje('Reserva creada correctamente.', false);
          this.cargarReservas(user.username);
          this.nuevaReserva = { idEvento: 0, cantidad: 1, observaciones: '' };
        },
        error: (err) => this.mostrarError(err, 'No se ha podido crear la reserva.'),
      });
  }

  private mostrarMensaje(msg: string, error: boolean): void {
    this.feedback.set(msg);
    this.esError.set(error);
    this.cdr.markForCheck();
  }

  private mostrarError(err: unknown, fallback: string): void {
    const error = err as { error?: string | { message?: string; error?: string } };
    const message =
      typeof error.error === 'string' ? error.error : (error.error?.message ?? error.error?.error);
    this.mostrarMensaje(message ?? fallback, true);
  }
}
