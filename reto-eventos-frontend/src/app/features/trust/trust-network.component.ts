import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { BRANDS } from './brands';

/**
 * Portada: la red de confianza, entre Collaborators y el cierre, con el formato de las demás secciones.
 * Quienes trabajan con AlienMilk, en una cinta que avanza sola, y la trayectoria en cuatro cifras.
 */
@Component({
  selector: 'app-trust-network',
  standalone: true,
  imports: [FitLineDirective],
  templateUrl: './trust-network.component.html',
  styleUrl: './trust-network.component.css',
  // El fondo de la portada pinta de blanco este elemento (ver liquid-backdrop.component.ts).
  host: { 'data-backdrop-block': '' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustNetworkComponent {
  protected readonly brands = BRANDS;
}
