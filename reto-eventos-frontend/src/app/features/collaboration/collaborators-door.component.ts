import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SampleReceptionComponent } from './sample-reception.component';

/**
 * La puerta de Collaborators («¿Quieres formar parte de AlienMilk?») en su posición final, sin la
 * animación de apertura: el marco de pliegues y, dentro, el panel. Se dibuja a su tamaño de diseño
 * y quien la usa la escala con `zoom`, porque la perspectiva va en medidas fijas.
 */
@Component({
  selector: 'app-collaborators-door',
  standalone: true,
  imports: [SampleReceptionComponent],
  templateUrl: './collaborators-door.component.html',
  styleUrl: './collaborators-door.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaboratorsDoorComponent {}
