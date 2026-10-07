import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { RequestService } from '../../../core/services/request.service';
import { EstadoSolicitud, Solicitud } from '../../../models/api.models';

type Filter = 'NUEVA' | 'ATENDIDA' | 'TODAS';

/**
 * Bandeja de las solicitudes que llegan desde los formularios públicos. Muestra los datos tal como
 * se enviaron, con sus etiquetas, así que sirve para cualquier formulario del molde sin cambios.
 */
@Component({
  selector: 'app-admin-requests-panel',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-requests-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .requests-panel {
      grid-column: 1 / -1;
    }

    .request-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .request-filters button[aria-pressed='true'] {
      background: #ff7f7f;
      color: #211e24;
    }

    .request-card,
    .request-card :is(p, dl) {
      font-family: 'Nunito', sans-serif;
    }

    .request-card a {
      color: #f1ecef;
      text-underline-offset: 0.2em;
    }

    .request-card {
      display: grid;
      gap: 0.75rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: #211e24;
    }

    .request-card.is-new {
      box-shadow: inset 3px 0 0 #ff7f7f;
    }

    .request-card-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem 1rem;
    }

    .request-card-head p {
      margin: 0.2rem 0 0;
      color: #b9afb6;
    }

    .request-data {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.5rem 1.25rem;
      margin: 0;
    }

    .request-data dt {
      color: #b9afb6;
      font-size: 0.8rem;
    }

    .request-data dd {
      margin: 0.1rem 0 0;
      overflow-wrap: anywhere;
      white-space: pre-line;
    }

    .request-data .is-wide {
      grid-column: 1 / -1;
    }

    .panel-feedback {
      margin: 0;
      color: #b9afb6;
    }

    .panel-feedback.is-error {
      color: #fca5a5;
    }
  `,
})
export class AdminRequestsPanelComponent implements OnInit {
  private readonly requests = inject(RequestService);

  readonly all = signal<Solicitud[]>([]);
  readonly filter = signal<Filter>('NUEVA');
  readonly loading = signal(true);
  readonly feedback = signal<{ text: string; error: boolean } | null>(null);

  readonly visible = computed(() => {
    const filter = this.filter();
    return filter === 'TODAS' ? this.all() : this.all().filter(({ estado }) => estado === filter);
  });
  readonly newCount = computed(() => this.all().filter(({ estado }) => estado === 'NUEVA').length);

  readonly filters: { value: Filter; label: string }[] = [
    { value: 'NUEVA', label: 'Nuevas' },
    { value: 'ATENDIDA', label: 'Atendidas' },
    { value: 'TODAS', label: 'Todas' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.requests.list().subscribe({
      next: (solicitudes) => {
        this.all.set(solicitudes);
        this.loading.set(false);
        this.feedback.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.feedback.set({ text: 'No se han podido cargar las solicitudes.', error: true });
      },
    });
  }

  setStatus(solicitud: Solicitud, estado: EstadoSolicitud): void {
    this.requests.setStatus(solicitud.idSolicitud, estado).subscribe({
      next: (updated) => {
        this.all.update((list) =>
          list.map((item) => (item.idSolicitud === updated.idSolicitud ? updated : item)),
        );
        this.feedback.set({
          text: `${updated.referencia}: ${estado === 'ATENDIDA' ? 'atendida' : 'pendiente de nuevo'}.`,
          error: false,
        });
      },
      error: () => this.feedback.set({ text: 'No se ha podido cambiar el estado.', error: true }),
    });
  }

  remove(solicitud: Solicitud): void {
    if (
      !confirm(`¿Borrar la solicitud ${solicitud.referencia}? Sus datos se eliminan para siempre.`)
    ) {
      return;
    }
    this.requests.remove(solicitud.idSolicitud).subscribe({
      next: () => {
        this.all.update((list) =>
          list.filter((item) => item.idSolicitud !== solicitud.idSolicitud),
        );
        this.feedback.set({ text: `${solicitud.referencia} borrada.`, error: false });
      },
      error: () => this.feedback.set({ text: 'No se ha podido borrar la solicitud.', error: true }),
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
