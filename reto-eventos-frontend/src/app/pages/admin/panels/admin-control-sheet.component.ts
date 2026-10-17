import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { credentialLabel } from '../../../features/attendance/attendance';
import { sessionSchedule } from '../../../features/sessions/session.presenter';
import { EventoAdmin, Reserva } from '../../../models/api.models';
import {
  errorMessage,
  formatDay,
  formatMoney,
  formatTime,
  matches,
  plural,
  reviewLabel,
} from '../../../shared/panel/panel-format';

/** «Cata de Leche Abducida» → «cata-de-leche-abducida», para el nombre del archivo. */
const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Quién se ve en la tabla: todos, los que faltan por entrar o los que ya han entrado. */
type DoorFilter = 'TODOS' | 'FALTAN' | 'DENTRO';

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
  /** Su lugar en la reserva (1, 2…), para marcar su entrada; null en una reserva sin registrar. */
  orden: number | null;
  /** Cuándo entró, si ya entró. */
  entrada: string | null;
  /** Personas que representa la fila y cuántas han entrado: 1 y 0/1 si está registrada; las plazas, si no. */
  personas: number;
  dentro: number;
}

/**
 * Hoja de control de ingreso de una sesión: lo que lleva el personal en la puerta, un participante
 * por fila con la credencial que presentará. En pantalla (una tablet en la puerta), cada casilla se
 * marca al entrar y se busca por nombre; impresa, sale con las casillas marcadas hasta ese momento.
 * Encima, el parte para sala: las incompatibilidades agrupadas y lo que requiere revisión.
 */
@Component({
  selector: 'app-admin-control-sheet',
  standalone: true,
  imports: [RouterLink, FormsModule],
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
          {
            reserva,
            numero,
            nombre: null,
            credencial: null,
            procedencia: null,
            incompatibilidades: null,
            first: true,
            orden: null,
            entrada: null,
            personas: reserva.cantidad,
            dentro: reserva.entradasSinRegistrar,
          },
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
        orden: i + 1,
        entrada: persona.entradaEn ?? null,
        personas: 1,
        dentro: persona.entradaEn ? 1 : 0,
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

  // La puerta: cuántos han entrado, buscar a alguien y ver quién falta.
  readonly query = signal('');
  readonly doorFilter = signal<DoorFilter>('TODOS');
  /** La fila que se está guardando, para no marcarla dos veces seguidas. */
  readonly saving = signal<string | null>(null);
  readonly doorError = signal<string | null>(null);

  readonly inside = computed(() => this.rows().reduce((sum, row) => sum + row.dentro, 0));

  readonly doorFilters = computed(() => {
    const total = this.seats();
    const inside = this.inside();
    return [
      { value: 'TODOS' as DoorFilter, label: 'Todos', count: total },
      { value: 'FALTAN' as DoorFilter, label: 'Faltan', count: total - inside },
      { value: 'DENTRO' as DoorFilter, label: 'Han entrado', count: inside },
    ];
  });

  readonly visibleRows = computed(() => {
    const query = this.query();
    const filter = this.doorFilter();
    return this.rows().filter(
      (row) =>
        (filter === 'TODOS' || (filter === 'FALTAN' ? row.dentro < row.personas : row.dentro > 0)) &&
        matches(query, row.nombre, row.numero, row.reserva.nombreCliente, row.reserva.telefono),
    );
  });

  readonly time = formatTime;

  /** La clave de una fila, para saber cuál se está guardando. */
  key(row: SheetRow): string {
    return `${row.reserva.idReserva}-${row.orden ?? 'r'}`;
  }

  /** Un participante registrado entra, o se deshace si se marcó por error. */
  toggleEntry(row: SheetRow): void {
    if (row.orden === null || this.saving()) {
      return;
    }
    this.save(row, this.admin.marcarEntrada(row.reserva.idReserva, row.orden, !row.entrada));
  }

  /**
   * En una reserva sin registrar, cada casilla es una plaza: pulsar la tercera dice que han entrado tres;
   * pulsar la última marcada la desmarca.
   */
  setSeatsInside(row: SheetRow, seat: number): void {
    if (this.saving()) {
      return;
    }
    const plazas = seat + 1 === row.dentro ? seat : seat + 1;
    this.save(row, this.admin.contarEntradas(row.reserva.idReserva, plazas));
  }

  /** Quien reservó por teléfono paga al llegar. */
  collect(row: SheetRow): void {
    if (this.saving()) {
      return;
    }
    this.save(row, this.admin.marcarCobrada(row.reserva.idReserva));
  }

  private save(row: SheetRow, request: ReturnType<AdminService['marcarCobrada']>): void {
    this.saving.set(this.key(row));
    this.doorError.set(null);
    request.subscribe({
      next: (updated) => {
        this.saving.set(null);
        this.reservations.update((list) => list.map((item) => (item.idReserva === updated.idReserva ? updated : item)));
      },
      error: (error) => {
        this.saving.set(null);
        this.doorError.set(errorMessage(error, 'No se ha podido guardar. Inténtalo de nuevo.'));
      },
    });
  }

  /** Todo lo que pide adaptaciones o material, con lo decidido: en sala hay que saber también lo aceptado. */
  readonly adaptations = computed(() => this.reservations().filter((reserva) => reserva.revision));
  readonly review = reviewLabel;

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

  /**
   * La lista de la puerta en CSV, para quien la quiera en una hoja de cálculo: una fila por persona (las
   * reservas sin registrar, una por reserva). Con punto y coma y BOM, que es lo que abre bien Excel en español.
   */
  exportCsv(): void {
    const session = this.session();
    if (!session) {
      return;
    }
    const header = ['Localizador', 'Cliente', 'Teléfono', 'Participante', 'Credencial', 'Procedencia',
      'Incompatibilidades', 'Plazas', 'Han entrado', 'Pago'];
    const pago: Record<string, string> = {
      PENDIENTE: 'Pendiente de pago',
      PAGADA: 'Pagada',
      EN_TAQUILLA: 'En taquilla',
      COBRADA_TAQUILLA: 'Cobrada en taquilla',
    };
    const lines = this.rows().map((row) => [
      row.numero,
      row.reserva.nombreCliente,
      row.reserva.telefono ?? '',
      row.nombre ?? 'Sin registrar',
      row.credencial ?? '',
      row.procedencia ?? '',
      row.incompatibilidades ?? '',
      String(row.personas),
      row.orden === null ? String(row.dentro) : row.entrada ? formatTime(row.entrada) : '',
      pago[row.reserva.estadoPago] ?? '',
    ]);
    const cell = (value: string) => (/[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const csv = [header, ...lines].map((line) => line.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `control-${session.fechaInicio}-${slug(session.nombre)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }
}
