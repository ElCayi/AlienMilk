import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';

import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { brandMark } from './brands';
import { TrustNetworkService } from './trust-network.service';

/**
 * Portada: la red de confianza, entre Collaborators y el cierre, con el formato de las demás secciones.
 * Las distinciones de la casa, quienes trabajan con AlienMilk, en una cinta que avanza sola, y la
 * trayectoria en cuatro cifras, todo del backend; luego, las experiencias sin firma y la discreción.
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
export class TrustNetworkComponent implements OnInit {
  private readonly trust = inject(TrustNetworkService);

  /** La primera distinción va destacada, con su medalla; las demás, en fila. */
  protected readonly featuredAward = computed(() => this.trust.awards()[0] ?? null);
  protected readonly otherAwards = computed(() => this.trust.awards().slice(1));
  /** La leyenda que gira dentro de la medalla: la sigla y el año, «CCSL.1962», repetidos hasta dar la
   *  vuelta (menos veces cuanto más larga). */
  protected readonly medalLegend = computed(() => {
    const award = this.featuredAward();
    if (!award) {
      return '';
    }
    const year = award.date.match(/\d{4}/)?.[0];
    // Con espacios duros: el último, al final de la vuelta, no se pierde y la junta no se nota.
    const unit = `${award.code}${year ? '.' + year : ''}\u00a0·\u00a0`;
    return unit.repeat(Math.max(2, Math.round(60 / unit.length)));
  });
  protected readonly brands = this.trust.brands;
  protected readonly figures = this.trust.figures;
  protected readonly brandMark = brandMark;

  ngOnInit(): void {
    this.trust.load();
  }
}
