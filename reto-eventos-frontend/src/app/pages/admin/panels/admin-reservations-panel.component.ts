import { Component, computed, DestroyRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { EventoAdmin, Reserva, Usuario } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import {
  errorMessage,
  formatDay,
  formatMoney,
  matches,
  plural,
  profileLabel,
  reservationState,
} from '../../../shared/panel/panel-format';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { AdminSummaryService } from '../admin-summary.service';

/** Una reserva admite de 1 a 10 plazas, y nadie pasa de 10 en la misma sesión (lo comprueba el servidor). */
const MAX_PLAZAS = 10;

/**
 * Reservas de todas las cuentas: buscar por cliente o por sesión, dar de alta una a mano (por
 * teléfono, por ejemplo) y cancelarla. Las reglas de aforo y de diez plazas son las del servidor.
 * Se puede llegar filtrada desde Sesiones (?sesion=) o desde Usuarios (?cuenta=).
 */
@Component({
  selector: 'app-admin-reservations-panel',
  standalone: true,
  imports: [FormsModule, PanelDialogComponent, KeepHeightDirective],
  templateUrl: './admin-reservations-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminReservationsPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);
  private readonly summary = inject(AdminSummaryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly reservations = signal<Reserva[]>([]);
  readonly sessions = signal<EventoAdmin[]>([]);
  readonly users = signal<Usuario[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<number | null>(null);

  readonly query = signal('');
  /** 0: todas las sesiones. */
  readonly sessionFilter = signal(0);

  readonly visible = computed(() => {
    const idEvento = this.sessionFilter();
    const query = this.query();
    return this.reservations().filter(
      (reserva) =>
        (!idEvento || reserva.idEvento === idEvento) &&
        matches(query, reserva.nombreCliente, reserva.username, reserva.nombreEvento, reserva.observaciones),
    );
  });

  readonly totals = computed(() => {
    const list = this.visible();
    return {
      plazas: list.reduce((sum, reserva) => sum + reserva.cantidad, 0),
      importe: list.reduce((sum, reserva) => sum + Number(reserva.precioVenta), 0),
    };
  });

  /** Solo se reserva en sesiones activas. */
  readonly openSessions = computed(() => this.sessions().filter((session) => session.estado === 'ACTIVO'));

  // Alta manual, en el diálogo.
  readonly dialog = viewChild.required(PanelDialogComponent);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  form = emptyForm();

  readonly state = reservationState;
  readonly day = formatDay;
  readonly money = formatMoney;
  readonly plural = plural;
  readonly profile = profileLabel;
  readonly maxPlazas = MAX_PLAZAS;

  ngOnInit(): void {
    // Desde Usuarios llega la cuenta a buscar; el filtro de sesión sigue a la dirección.
    this.query.set(this.route.snapshot.queryParamMap.get('cuenta') ?? '');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.sessionFilter.set(Number(params.get('sesion')) || 0);
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      reservations: this.admin.getReservas(),
      sessions: this.admin.getEventos(),
      users: this.admin.getUsuarios(),
    }).subscribe({
      next: ({ reservations, sessions, users }) => {
        this.reservations.set(reservations);
        this.sessions.set(sessions);
        this.users.set([...users].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /** El filtro de sesión va en la dirección, para poder enlazarlo y volver a él. */
  filterBySession(idEvento: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sesion: idEvento || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Plazas que quedan en una sesión. */
  free(session: EventoAdmin): number {
    return Math.max(0, session.aforoMaximo - session.plazasReservadas);
  }

  selectedSession(): EventoAdmin | undefined {
    return this.sessions().find((session) => session.idEvento === this.form.idEvento);
  }

  /** Lo más que se puede pedir en la sesión elegida: 10 o lo que quede libre. */
  maxForSelected(): number {
    const session = this.selectedSession();
    return session ? Math.max(1, Math.min(MAX_PLAZAS, this.free(session))) : MAX_PLAZAS;
  }

  openNew(): void {
    this.form = emptyForm(this.sessionFilter() || null);
    this.formError.set(null);
    this.dialog().open();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const { username, idEvento, cantidad, observaciones } = this.form;
    if (!username || !idEvento) {
      this.formError.set('Elige la cuenta y la sesión.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.admin
      .crearReservaParaUsuario(username, idEvento, { cantidad: cantidad ?? 0, observaciones })
      .subscribe({
        next: (reserva) => {
          this.saving.set(false);
          this.dialog().close();
          this.notice.set({
            text: `Reserva de ${plural(reserva.cantidad, 'plaza', 'plazas')} en «${reserva.nombreEvento}» para ${reserva.nombreCliente}.`,
            error: false,
          });
          this.load();
          this.summary.refresh();
        },
        error: (error) => {
          this.saving.set(false);
          this.formError.set(errorMessage(error, 'No se ha podido crear la reserva.'));
        },
      });
  }

  async cancel(reserva: Reserva): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Cancelar la reserva?',
      message: `Se liberan ${plural(reserva.cantidad, 'plaza', 'plazas')} de «${reserva.nombreEvento}» y la reserva desaparece del panel de ${reserva.nombreCliente}.`,
      confirm: 'Cancelar reserva',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(reserva.idReserva);
    this.admin.cancelarReservaAdmin(reserva.idReserva).subscribe({
      next: () => {
        this.busy.set(null);
        this.reservations.update((list) => list.filter((item) => item.idReserva !== reserva.idReserva));
        this.sessions.update((list) =>
          list.map((session) =>
            session.idEvento === reserva.idEvento
              ? {
                  ...session,
                  plazasReservadas: session.plazasReservadas - reserva.cantidad,
                  reservas: session.reservas - 1,
                }
              : session,
          ),
        );
        this.notice.set({ text: `Reserva de ${reserva.nombreCliente} cancelada.`, error: false });
        this.summary.refresh();
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido cancelar la reserva.'), error: true });
        this.load();
      },
    });
  }
}

function emptyForm(idEvento: number | null = null) {
  return {
    username: '',
    idEvento,
    cantidad: 1 as number | null,
    observaciones: '',
  };
}
