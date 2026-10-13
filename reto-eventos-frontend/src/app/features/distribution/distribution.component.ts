import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ShopService } from '../../core/services/shop.service';
import { Producto } from '../../models/api.models';
import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';
import { MoleculeComponent } from '../shop/molecule/molecule.component';

/** Lo que se ve de cada producto de la selección: sin precio, que esto es un anuncio y no el catálogo. */
type DistributionPick = Pick<
  Producto,
  'slug' | 'nombre' | 'procedencia' | 'resumen' | 'lote' | 'formato' | 'tono'
>;

/** La selección, en este orden: una leche, un fermento y una pieza de servicio. */
const FEATURED = ['leche-simbiotica-de-liquen', 'kefir-de-tau-ceti', 'copa-de-degustacion'];

/**
 * La de reserva, la del catálogo inicial (migraciones/2026-10-09-tienda.sql), mientras llega la de
 * la tienda o si no responde: así el bloque nunca sale vacío.
 */
const FALLBACK_PICKS: readonly DistributionPick[] = [
  {
    slug: 'leche-simbiotica-de-liquen',
    nombre: 'Leche simbiótica de liquen',
    procedencia: 'TRAPPIST-1e · Valle de Hesse',
    resumen: 'La producen dos organismos a la vez. Ninguno de los dos acepta la autoría.',
    lote: 'AM-L-0388',
    formato: '330 ml',
    tono: 'liquen',
  },
  {
    slug: 'kefir-de-tau-ceti',
    nombre: 'Kéfir de Tau Ceti',
    procedencia: 'Tau Ceti · Federación de Catadores',
    resumen: 'Fermentado con granos cedidos por la Federación de Catadores de Tau Ceti.',
    lote: 'AM-D-0131',
    formato: '500 ml',
    tono: 'lila',
  },
  {
    slug: 'copa-de-degustacion',
    nombre: 'Copa de degustación',
    procedencia: 'Tierra · Taller de vidrio de A Coruña',
    resumen: 'La copa de las sesiones: boca estrecha para el aroma, base ancha para las leches densas.',
    lote: 'AM-M-0023',
    formato: '180 ml',
    tono: 'cristal',
  },
];

/**
 * Portada: AlienMilk Distribution, entre Localizaciones y Collaborators, con el formato de las demás
 * secciones. Debajo de la cabecera, el anuncio de la tienda: una pieza publicitaria y no un bloque
 * de catálogo, solo con la foto. Cierra la sección, en tinta, una selección de tres productos de la
 * tienda, cada uno con su muestra en forma de cultivo, y el único enlace a ella.
 */
@Component({
  selector: 'app-distribution',
  standalone: true,
  imports: [RouterLink, FitLineDirective, MoleculeComponent],
  templateUrl: './distribution.component.html',
  styleUrls: ['./distribution.component.css', '../shop/shop-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistributionComponent {
  private readonly shop = inject(ShopService);

  /** La selección con los datos de la tienda; si alguno ya no está a la venta, se queda fuera. */
  readonly picks = toSignal(
    this.shop.catalog().pipe(
      map(({ productos }) => {
        const found = FEATURED.flatMap((slug) => productos.filter((product) => product.slug === slug));
        return found.length ? found : FALLBACK_PICKS;
      }),
      catchError(() => of(FALLBACK_PICKS)),
    ),
    { initialValue: FALLBACK_PICKS },
  );

  private readonly picksList = viewChild<ElementRef<HTMLElement>>('picksList');
  private pickFrame = 0;
  /** El producto a la vista en el carrusel de móvil y tableta. */
  readonly activePick = signal(0);

  /** Lleva el carrusel de móvil al producto elegido en los puntos. */
  showPick(index: number): void {
    const list = this.picksList()?.nativeElement;
    // Cada producto ocupa todo el ancho del carrusel.
    list?.scrollTo({
      left: index * list.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  /** El producto activo, el que ocupa el carrusel (o el más cercano, a mitad de gesto). */
  trackActivePick(): void {
    cancelAnimationFrame(this.pickFrame);
    this.pickFrame = requestAnimationFrame(() => {
      const list = this.picksList()?.nativeElement;
      if (!list?.clientWidth) {
        return;
      }

      this.activePick.set(Math.round(list.scrollLeft / list.clientWidth));
    });
  }
}
