import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../../core/services/admin.service';
import { sessionSchedule } from '../../../features/sessions/session.presenter';
import { EventoAdmin, Reserva } from '../../../models/api.models';
import { isoDay } from '../../../shared/panel/filter-bar.component';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import { PanelGreetingComponent } from '../../../shared/panel/panel-greeting.component';
import { formatDay, formatMoney, plural } from '../../../shared/panel/panel-format';
import { AdminSummaryService } from '../admin-summary.service';
import { AdminControlSheetComponent } from './admin-control-sheet.component';

/** Las piezas del tablero; cada cual elige cuáles ve y en qué orden. */
type WidgetId = 'cifras' | 'hoy' | 'proximas' | 'minimo' | 'revision' | 'taquilla' | 'devoluciones' | 'ultimas';

const WIDGETS: { id: WidgetId; label: string; hint: string }[] = [
  { id: 'cifras', label: 'Cifras', hint: 'Sesiones activas, plazas, pedidos y solicitudes.' },
  { id: 'hoy', label: 'Hoy', hint: 'Las sesiones de hoy, con su hoja de control.' },
  { id: 'proximas', label: 'Próximas sesiones', hint: 'Las cinco siguientes, con su ocupación.' },
  { id: 'minimo', label: 'Por debajo del mínimo', hint: 'Las de los próximos 30 días que aún no llegan.' },
  { id: 'revision', label: 'Requieren revisión', hint: 'Adaptaciones y material por aceptar.' },
  { id: 'taquilla', label: 'Por cobrar en taquilla', hint: 'Lo que se paga al llegar.' },
  { id: 'devoluciones', label: 'Devoluciones por entregar', hint: 'Lo que hay que devolver en taquilla.' },
  { id: 'ultimas', label: 'Últimas reservas', hint: 'Las cinco más recientes.' },
];

/** Lo que se ve de serie, en este orden. */
const DEFAULT_LAYOUT: WidgetId[] = ['cifras', 'hoy', 'revision', 'proximas', 'minimo', 'taquilla'];

const STORAGE_KEY = 'am-vision-general';

/**
 * La visión general: el saludo (con el lápiz para cambiar el nombre) y un tablero de piezas que cada
 * cual elige y ordena (se guarda en este navegador). Cada pieza dice lo justo y lleva a su sitio, ya
 * filtrado. Es la entrada al panel; las demás secciones empiezan directamente con lo suyo.
 */
@Component({
  selector: 'app-admin-overview-panel',
  standalone: true,
  imports: [RouterLink, PanelGreetingComponent, PanelDialogComponent, AdminControlSheetComponent],
  templateUrl: './admin-overview-panel.component.html',
  styleUrls: [
    '../../../shared/panel/panel.css',
    '../../../shared/panel/panel-shell.css',
    './admin-overview-panel.component.css',
  ],
})
export class AdminOverviewPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly summaryService = inject(AdminSummaryService);

  readonly summary = this.summaryService.summary;
  readonly sessions = signal<EventoAdmin[]>([]);
  readonly reservations = signal<Reserva[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly widgets = WIDGETS;
  readonly layout = signal<WidgetId[]>(this.readLayout());

  readonly day = formatDay;
  readonly money = formatMoney;
  readonly plural = plural;
  readonly schedule = sessionSchedule;

  private readonly today = isoDay(new Date());

  /** Las sesiones vivas (activas y sin archivar), por fecha y hora. */
  private readonly active = computed(() =>
    this.sessions()
      .filter((session) => session.estado === 'ACTIVO' && !session.archivada)
      .sort((a, b) => (a.fechaInicio + a.horaInicio).localeCompare(b.fechaInicio + b.horaInicio)),
  );

  readonly hoy = computed(() => this.active().filter((session) => session.fechaInicio === this.today));

  readonly proximas = computed(() => this.active().filter((session) => session.fechaInicio >= this.today).slice(0, 5));

  readonly bajoMinimo = computed(() => {
    const limit = isoDay(new Date(Date.now() + 30 * 86_400_000));
    return this.active().filter(
      (session) =>
        session.fechaInicio >= this.today &&
        session.fechaInicio <= limit &&
        session.plazasReservadas < session.minimoAsistencia,
    );
  });

  /** Las reservas vivas: sin cancelar y de sesiones sin archivar. */
  private readonly live = computed(() =>
    this.reservations().filter((reserva) => !reserva.canceladaEn && !reserva.sesionArchivada),
  );

  readonly revision = computed(() => this.live().filter((reserva) => reserva.requiereRevision));

  readonly taquilla = computed(() =>
    this.live()
      .filter((reserva) => reserva.estadoPago === 'EN_TAQUILLA' && reserva.estadoEvento === 'ACTIVO')
      .sort((a, b) => a.fechaInicioEvento.localeCompare(b.fechaInicioEvento)),
  );

  readonly porCobrar = computed(() => this.taquilla().reduce((sum, reserva) => sum + Number(reserva.precioVenta), 0));

  readonly devoluciones = computed(() =>
    this.reservations().flatMap((reserva) =>
      (reserva.devoluciones ?? [])
        .filter((devolucion) => devolucion.estado === 'PENDIENTE')
        .map((devolucion) => ({ reserva, devolucion })),
    ),
  );

  readonly porDevolver = computed(() =>
    this.devoluciones().reduce((sum, item) => sum + Number(item.devolucion.importe), 0),
  );

  readonly ultimas = computed(() => [...this.reservations()].sort((a, b) => b.idReserva - a.idReserva).slice(0, 5));

  ngOnInit(): void {
    this.summaryService.refresh();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({ sessions: this.admin.getEventos(), reservations: this.admin.getReservas() }).subscribe({
      next: ({ sessions, reservations }) => {
        this.sessions.set(sessions);
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /** Una cifra del resumen, o un guion mientras llega (o si no llega). */
  figure(value: number | undefined): string {
    return value === undefined ? '—' : new Intl.NumberFormat('es-ES').format(value);
  }

  number(reserva: Reserva): string {
    return String(reserva.idReserva).padStart(4, '0');
  }

  occupancy(session: EventoAdmin): number {
    return session.aforoMaximo ? Math.min(100, Math.round((session.plazasReservadas / session.aforoMaximo) * 100)) : 0;
  }

  // La hoja de control de una sesión de hoy, en su diálogo, como en Sesiones.
  readonly controlId = signal<number | null>(null);
  readonly controlDialog = viewChild.required<PanelDialogComponent>('controlDialog');

  openControl(idEvento: number): void {
    this.controlId.set(idEvento);
    this.controlDialog().open();
  }

  // Personalizar: qué piezas se ven y en qué orden, en su diálogo.
  readonly customizeDialog = viewChild.required<PanelDialogComponent>('customizeDialog');
  /** Lo que se está eligiendo; se aplica con «Guardar». */
  readonly draft = signal<{ id: WidgetId; visible: boolean }[]>([]);

  customize(): void {
    const visible = this.layout();
    const hidden = WIDGETS.map((widget) => widget.id).filter((id) => !visible.includes(id));
    this.draft.set([
      ...visible.map((id) => ({ id, visible: true })),
      ...hidden.map((id) => ({ id, visible: false })),
    ]);
    this.customizeDialog().open();
  }

  toggleDraft(index: number): void {
    this.draft.update((list) => list.map((item, i) => (i === index ? { ...item, visible: !item.visible } : item)));
  }

  moveDraft(index: number, step: -1 | 1): void {
    this.draft.update((list) => {
      const target = index + step;
      if (target < 0 || target >= list.length) {
        return list;
      }
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  resetDraft(): void {
    const hidden = WIDGETS.map((widget) => widget.id).filter((id) => !DEFAULT_LAYOUT.includes(id));
    this.draft.set([
      ...DEFAULT_LAYOUT.map((id) => ({ id, visible: true })),
      ...hidden.map((id) => ({ id, visible: false })),
    ]);
  }

  saveLayout(): void {
    const layout = this.draft()
      .filter((item) => item.visible)
      .map((item) => item.id);
    this.layout.set(layout);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Sin almacenamiento, el tablero vale mientras dure la página.
    }
    this.customizeDialog().close();
  }

  widgetLabel(id: WidgetId): string {
    return WIDGETS.find((widget) => widget.id === id)?.label ?? id;
  }

  widgetHint(id: WidgetId): string {
    return WIDGETS.find((widget) => widget.id === id)?.hint ?? '';
  }

  private readLayout(): WidgetId[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const known = new Set(WIDGETS.map((widget) => widget.id));
      const saved = raw ? (JSON.parse(raw) as WidgetId[]).filter((id) => known.has(id)) : null;
      return saved ?? DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  }
}
