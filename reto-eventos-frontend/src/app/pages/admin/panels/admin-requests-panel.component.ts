import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RequestService } from '../../../core/services/request.service';
import { EstadoSolicitud, Solicitud } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { errorMessage, formatDayTime, matches } from '../../../shared/panel/panel-format';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';
import { AdminSummaryService } from '../admin-summary.service';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

type Filter = 'NUEVA' | 'ATENDIDA' | 'TODAS';

/**
 * Bandeja de las solicitudes que llegan desde los formularios públicos. Muestra los datos tal como
 * se enviaron, con sus etiquetas, así que sirve para cualquier formulario del molde sin cambios.
 */
@Component({
  selector: 'app-admin-requests-panel',
  standalone: true,
  imports: [SectionHelpComponent, FormsModule, KeepHeightDirective],
  templateUrl: './admin-requests-panel.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-requests-panel.component.css'],
})
export class AdminRequestsPanelComponent implements OnInit {
  private readonly requests = inject(RequestService);
  private readonly confirm = inject(PanelConfirmService);
  private readonly summary = inject(AdminSummaryService);

  readonly all = signal<Solicitud[]>([]);
  readonly filter = signal<Filter>('NUEVA');
  readonly query = signal('');
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly busy = signal<number | null>(null);
  readonly feedback = signal<{ text: string; error: boolean } | null>(null);

  readonly filters = computed(() => {
    const list = this.all();
    return [
      { value: 'NUEVA' as Filter, label: 'Sin atender', count: list.filter((s) => s.estado === 'NUEVA').length },
      { value: 'ATENDIDA' as Filter, label: 'Atendidas', count: list.filter((s) => s.estado === 'ATENDIDA').length },
      { value: 'TODAS' as Filter, label: 'Todas', count: list.length },
    ];
  });

  readonly visible = computed(() => {
    const filter = this.filter();
    const query = this.query();
    return this.all().filter(
      (solicitud) =>
        (filter === 'TODAS' || solicitud.estado === filter) &&
        matches(
          query,
          solicitud.referencia,
          solicitud.asunto,
          solicitud.nombre,
          solicitud.email,
          ...solicitud.datos.map(({ valor }) => valor),
        ),
    );
  });

  readonly when = formatDayTime;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.requests.list().subscribe({
      next: (solicitudes) => {
        this.all.set(solicitudes);
        this.loading.set(false);
        this.feedback.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
    this.summary.refresh();
  }

  setStatus(solicitud: Solicitud, estado: EstadoSolicitud): void {
    this.busy.set(solicitud.idSolicitud);
    this.requests.setStatus(solicitud.idSolicitud, estado).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.all.update((list) =>
          list.map((item) => (item.idSolicitud === updated.idSolicitud ? updated : item)),
        );
        this.feedback.set({
          text: `${updated.referencia}: ${estado === 'ATENDIDA' ? 'atendida' : 'pendiente de nuevo'}.`,
          error: false,
        });
        this.summary.refresh();
      },
      error: (error) => {
        this.busy.set(null);
        this.feedback.set({ text: errorMessage(error, 'No se ha podido cambiar el estado.'), error: true });
      },
    });
  }

  async remove(solicitud: Solicitud): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `¿Borrar la solicitud ${solicitud.referencia}?`,
      message: 'Sus datos se eliminan para siempre. Si solo está resuelta, márcala como atendida.',
      confirm: 'Borrar solicitud',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(solicitud.idSolicitud);
    this.requests.remove(solicitud.idSolicitud).subscribe({
      next: () => {
        this.busy.set(null);
        this.all.update((list) => list.filter((item) => item.idSolicitud !== solicitud.idSolicitud));
        this.feedback.set({ text: `${solicitud.referencia} borrada.`, error: false });
        this.summary.refresh();
      },
      error: (error) => {
        this.busy.set(null);
        this.feedback.set({ text: errorMessage(error, 'No se ha podido borrar la solicitud.'), error: true });
      },
    });
  }

  replyHref(solicitud: Solicitud): string {
    return `mailto:${solicitud.email}?subject=${encodeURIComponent(`${solicitud.referencia} · ${solicitud.asunto}`)}`;
  }

  /** Nombre y correo ya van en la cabecera de la tarjeta. */
  details(solicitud: Solicitud): Solicitud['datos'] {
    return solicitud.datos.filter(({ clave }) => clave !== 'nombre' && clave !== 'email');
  }
}
