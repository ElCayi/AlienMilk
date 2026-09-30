import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
} from '@angular/core';

import { Estacion } from '../../models/station.models';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { SampleReceptionComponent } from '../collaboration/sample-reception.component';

@Component({
  selector: 'app-locations-atlas',
  standalone: true,
  imports: [CommonModule, FitLineDirective, SampleReceptionComponent],
  templateUrl: './locations-atlas.component.html',
  styleUrl: './locations-atlas.component.css',
  host: { '[class.locations-collaboration-section]': 'collaborationMode' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsAtlasComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private deployObserver?: IntersectionObserver;
  @Input() stations: Estacion[] = [];
  @Input() loading = false;
  @Input() collaborationMode = false;

  // En escritorio las estaciones esperan plegadas bajo el eje del planetario y se despliegan solas
  // la primera vez que el planetario entra en pantalla (animación en locations-dossier.css). Sin
  // JS, o con el movimiento reducido, nunca se pliegan.
  ngAfterViewInit(): void {
    const chart = this.host.nativeElement.querySelector<HTMLElement>('.locations-chart');
    if (
      this.collaborationMode ||
      !chart ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    chart.classList.add('is-armed');
    this.deployObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          chart.classList.add('is-deployed');
          this.deployObserver?.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    this.deployObserver.observe(chart);
  }

  ngOnDestroy(): void {
    this.deployObserver?.disconnect();
  }

  trackStation(_index: number, station: Estacion): string {
    return station.codigo;
  }
}
