import { Component, inject, OnDestroy } from '@angular/core';

import { DemoRestoreService } from '../demo-restore.service';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

/**
 * Demo: esta web es una demostración, así que se puede devolver a su estado de fábrica. El servidor
 * borra todo lo creado o cambiado y vuelve a cargar los datos de partida (ver FabricaService).
 */
@Component({
  selector: 'app-admin-demo-panel',
  standalone: true,
  imports: [SectionHelpComponent],
  templateUrl: './admin-demo-panel.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './admin-demo-panel.component.css'],
})
export class AdminDemoPanelComponent implements OnDestroy {
  readonly demo = inject(DemoRestoreService);

  ngOnDestroy(): void {
    this.demo.failure.set(null);
  }
}
