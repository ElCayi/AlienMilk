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
  private panelObserver?: ResizeObserver;
  private readonly revealPanel = (event: Event) => this.scrollToPanel(event.target);
  @Input() stations: Estacion[] = [];
  @Input() loading = false;
  @Input() collaborationMode = false;

  // En escritorio las minimilks esperan en el norte de su órbita y arrancan la primera vez que el
  // planetario entra en pantalla (animación en locations-horizontal.css). Sin JS, o con el
  // movimiento reducido, están ya en su sitio.
  ngAfterViewInit(): void {
    const chart = this.host.nativeElement.querySelector<HTMLElement>('.locations-chart');
    this.watchPanelHeights(chart);
    // «toggle» no burbujea: se escucha en captura para enterarse de cualquiera de los tres paneles.
    chart?.addEventListener('toggle', this.revealPanel, true);
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
    this.host.nativeElement
      .querySelector('.locations-chart')
      ?.removeEventListener('toggle', this.revealPanel, true);
    this.deployObserver?.disconnect();
    this.panelObserver?.disconnect();
  }

  // Los desplegables de las tres estaciones miden siempre lo mismo, estén abiertos uno o varios: el
  // del contenido más largo. Un panel cerrado no se puede medir, así que se mide una copia abierta e
  // invisible de cada uno. Se repite cuando cambia el ancho (el texto se reparte en otras líneas) o
  // llegan las estaciones.
  private watchPanelHeights(chart: HTMLElement | null): void {
    if (this.collaborationMode || !chart || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => {
      const stations = chart.querySelectorAll<HTMLDetailsElement>('.location-data');
      if (!stations.length) {
        return;
      }

      const probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText =
        'position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;' +
        `width:${stations[0].getBoundingClientRect().width}px`;
      chart.append(probe);

      let tallest = 0;
      stations.forEach((station) => {
        const copy = station.cloneNode(true) as HTMLDetailsElement;
        copy.open = true;
        probe.append(copy);
        const panel = copy.querySelector<HTMLElement>('.location-data-details');
        if (panel) {
          panel.style.minHeight = '0';
          tallest = Math.max(tallest, panel.offsetHeight);
        }
      });
      probe.remove();

      chart.style.setProperty('--station-panel-height', `${Math.ceil(tallest)}px`);
    };

    this.panelObserver = new ResizeObserver(measure);
    this.panelObserver.observe(chart);
    document.fonts?.ready.then(measure);
  }

  // Al abrir un panel que quedaría por debajo del borde de la pantalla, la página baja lo justo para
  // mostrarlo entero, a la vez que se despliega. Nunca tanto como para esconder su título bajo la
  // barra superior. El panel ya ocupa su alto final al abrirse (lo que se anima es el recorte), así
  // que se puede medir desde el primer momento.
  private scrollToPanel(target: EventTarget | null): void {
    if (!(target instanceof HTMLDetailsElement) || !target.open) {
      return;
    }

    const panel = target.querySelector<HTMLElement>('.location-data-details');
    const summary = target.querySelector('summary');
    if (!panel || !summary) {
      return;
    }

    const air = 32;
    const topbar = document.querySelector('.topbar')?.getBoundingClientRect().height ?? 0;
    const panelBottom =
      summary.getBoundingClientRect().bottom +
      parseFloat(getComputedStyle(panel).marginTop) +
      panel.offsetHeight;
    const overflow = panelBottom + air - window.innerHeight;
    const room = target.getBoundingClientRect().top - topbar - air;
    const distance = Math.min(overflow, room);
    if (distance <= 0) {
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: distance, behavior: reduced ? 'auto' : 'smooth' });
  }

  trackStation(_index: number, station: Estacion): string {
    return station.codigo;
  }
}
