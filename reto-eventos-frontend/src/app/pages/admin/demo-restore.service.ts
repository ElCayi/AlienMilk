import { inject, Injectable, signal } from '@angular/core';

import { AdminService } from '../../core/services/admin.service';
import { PanelConfirmService } from '../../shared/panel/panel-confirm';
import { errorMessage } from '../../shared/panel/panel-format';

/**
 * Restaurar la demo a su estado de fábrica: lo usan la pestaña Demo y el atajo al pie de Sesiones.
 * El servidor borra todo lo creado o cambiado y vuelve a cargar los datos de partida (ver FabricaService).
 */
@Injectable({ providedIn: 'root' })
export class DemoRestoreService {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(PanelConfirmService);

  readonly restoring = signal(false);
  readonly failure = signal<string | null>(null);

  async restore(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Restaurar la demo?',
      message:
        'Se borrará todo lo creado o cambiado: sesiones, expedientes, fotos, reservas, cuentas, pedidos, ' +
        'solicitudes y la ficha de contacto. Vuelven los datos de partida. No se puede deshacer.',
      confirm: 'Restaurar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.restoring.set(true);
    this.failure.set(null);
    this.admin.restaurarFabrica().subscribe({
      // Todo ha cambiado (también, quizá, tu propia cuenta): se vuelve a cargar la aplicación entera.
      next: () => window.location.assign('/admin/sesiones'),
      error: (error) => {
        this.restoring.set(false);
        this.failure.set(errorMessage(error, 'No se ha podido restaurar la demo. No se ha cambiado nada.'));
      },
    });
  }
}
