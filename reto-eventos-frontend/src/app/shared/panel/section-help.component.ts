import { Component, input } from '@angular/core';

import { PanelDialogComponent } from './panel-dialog.component';

/**
 * La ayuda de una sección, junto a su título: un «?» que abre, en un diálogo, lo que antes era el párrafo
 * bajo el título. Así la sección empieza directamente con su trabajo, sin scroll de más, y la explicación
 * sigue a mano para quien la necesite.
 */
@Component({
  selector: 'app-section-help',
  standalone: true,
  imports: [PanelDialogComponent],
  template: `
    <button
      type="button"
      class="section-help"
      [attr.aria-label]="'Ayuda: qué es ' + heading()"
      title="¿Qué es esto?"
      (click)="dialog.open()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9.2 9.2a2.9 2.9 0 1 1 4 2.7c-.8.4-1.2 1-1.2 1.8v.6M12 17.2v.1" />
      </svg>
    </button>
    <app-panel-dialog #dialog [heading]="heading()">
      <div class="section-help-copy">
        <ng-content />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" (click)="dialog.close()">Entendido</button>
      </div>
    </app-panel-dialog>
  `,
  styleUrls: ['./panel.css', './section-help.component.css'],
})
export class SectionHelpComponent {
  /** El nombre de la sección: el título del diálogo. */
  readonly heading = input.required<string>();
}
