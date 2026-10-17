import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { credentialLabel } from '../../../features/attendance/attendance';
import { sessionSchedule } from '../../../features/sessions/session.presenter';
import { EventoAdmin, Reserva } from '../../../models/api.models';
import { formatDay, formatMoney, plural } from '../../../shared/panel/panel-format';

/** Una fila de la hoja: un participante registrado, o una reserva cuyos participantes faltan. */
interface SheetRow {
  reserva: Reserva;
  numero: string;
  nombre: string | null;
  credencial: string | null;
  procedencia: string | null;
  incompatibilidades: string | null;
  /** La primera fila de su reserva: lo que es de la reserva entera (el cobro) se dice una vez. */
  first: boolean;
}

/**
 * Hoja de control de ingreso de una sesión: lo que lleva el personal en la puerta, un participante
 * por fila con la credencial que presentará, para marcarlo a mano. Encima, el parte para sala: las
 * incompatibilidades agrupadas y lo que requiere revisión. Se imprime tal cual (solo la hoja).
 */
@Component({
  selector: 'app-admin-control-sheet',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-control-sheet.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-control-sheet.component.css'],
})
export class AdminControlSheetComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);

  readonly session = signal<EventoAdmin | null>(null);
  readonly reservations = signal<Reserva[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly day = formatDay;
  readonly schedule = sessionSchedule;
  readonly plural = plural;
  readonly money = formatMoney;
  readonly credential = credentialLabel;

  /** Por orden de reserva: cada participante en su fila; las reservas sin registrar, en una sola. */
  readonly rows = computed<SheetRow[]>(() =>
    this.reservations().flatMap((reserva): SheetRow[] => {
      const numero = this.number(reserva);
      if (!reserva.asistentes.length) {
        return [
          { reserva, numero, nombre: null, credencial: null, procedencia: null, incompatibilidades: null, first: true },
        ];
      }
      return reserva.asistentes.map((persona, i) => ({
        reserva,
        numero,
        nombre: persona.nombre,
        credencial: credentialLabel(persona.credencial),
        procedencia: persona.procedencia,
        incompatibilidades: persona.incompatibilidades,
        first: i === 0,
      }));
    }),
  );

  readonly seats = computed(() => this.reservations().reduce((sum, reserva) => sum + reserva.cantidad, 0));
  readonly registered = computed(() =>
    this.reservations().reduce((sum, reserva) => sum + reserva.asistentes.length, 0),
  );

  /** El parte para sala: cada incompatibilidad con cuántos participantes la declaran (sin distinguir mayúsculas). */
  readonly compatibilities = computed(() => {
    const groups = new Map<string, { text: string; count: number }>();
    for (const reserva of this.reservations()) {
      for (const persona of reserva.asistentes) {
        const text = persona.incompatibilidades?.trim();
        if (!text) {
          continue;
        }
        const key = text.toLocaleLowerCase('es');
        const group = groups.get(key) ?? { text, count: 0 };
        group.count++;
        groups.set(key, group);
      }
    }
    return [...groups.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'es'));
  });

  readonly toReview = computed(() => this.reservations().filter((reserva) => reserva.requiereRevision));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const idEvento = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({ sessions: this.admin.getEventos(), reservations: this.admin.getReservas() }).subscribe({
      next: ({ sessions, reservations }) => {
        this.session.set(sessions.find((session) => session.idEvento === idEvento) ?? null);
        this.reservations.set(
          reservations
            .filter((reserva) => reserva.idEvento === idEvento && !reserva.canceladaEn)
            .sort((a, b) => a.idReserva - b.idReserva),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  number(reserva: Reserva): string {
    return String(reserva.idReserva).padStart(4, '0');
  }

  /** Una casilla por plaza, para las reservas sin registrar. */
  seatsOf(reserva: Reserva): number[] {
    return Array.from({ length: reserva.cantidad }, (_, i) => i);
  }

  print(): void {
    window.print();
  }
}
