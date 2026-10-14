import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Para listas con filtros, que la vista no salte al filtrar. Dos causas:
 *
 * - El navegador ancla la posición a una fila visible (scroll anchoring); si el filtro la quita, coge
 *   otra y mueve la página para seguirla. La lista queda fuera de esa elección (`overflow-anchor`).
 * - Con pocas filas, la página se acortaría y el navegador subiría la vista para no quedarse más allá
 *   del final. El bloque no encoge por debajo de la altura más alta que ha tenido; con el ancho cambia
 *   todo el reparto de las filas, así que entonces vuelve a empezar.
 */
@Directive({ selector: '[appKeepHeight]' })
export class KeepHeightDirective {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    host.style.overflowAnchor = 'none';

    afterNextRender(() => {
      let tallest = 0;
      let width = host.clientWidth;
      const resize = new ResizeObserver(() => {
        if (host.clientWidth !== width) {
          width = host.clientWidth;
          tallest = 0;
          host.style.minHeight = '';
        }
        const height = host.getBoundingClientRect().height;
        if (height > tallest) {
          tallest = height;
          host.style.minHeight = `${tallest}px`;
        }
      });
      resize.observe(host);
      destroyRef.onDestroy(() => resize.disconnect());
    });
  }
}
