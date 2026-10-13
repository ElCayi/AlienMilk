import { inject, Injectable, signal } from '@angular/core';

import { AdminService } from '../../core/services/admin.service';
import { ResumenAdmin } from '../../models/api.models';

/**
 * Las cifras de la cabecera del panel y los avisos de sus pestañas. Las secciones lo vuelven a pedir
 * tras cada cambio que las mueve (una reserva, un pedido que sale, una solicitud atendida).
 */
@Injectable({ providedIn: 'root' })
export class AdminSummaryService {
  private readonly admin = inject(AdminService);

  readonly summary = signal<ResumenAdmin | null>(null);

  refresh(): void {
    this.admin.getResumen().subscribe({
      next: (summary) => this.summary.set(summary),
      // Sin resumen, la cabecera enseña guiones; el panel sigue funcionando.
      error: () => this.summary.set(null),
    });
  }
}
