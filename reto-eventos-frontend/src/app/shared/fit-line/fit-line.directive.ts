import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Norma para líneas de datos (dirección, fecha, horario...): nunca se parten en dos. Si el texto no
 * cabe, la letra se reduce lo justo para que quepa en una sola línea. Solo por debajo de `appFitLineMin`
 * (px) se deja partir, porque una línea ilegible es peor que dos.
 *
 * El elemento debe ocupar el ancho disponible (bloque o elemento de grid/flex con `min-width: 0`).
 */
@Directive({ selector: '[appFitLine]' })
export class FitLineDirective {
  readonly appFitLineMin = input(9);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const fit = () => {
        host.style.fontSize = '';
        host.style.whiteSpace = 'nowrap';
        const available = host.clientWidth;
        const needed = host.scrollWidth;
        if (!available || needed <= available) {
          return;
        }
        const base = parseFloat(getComputedStyle(host).fontSize);
        // El espaciado entre letras va en em, así que todo escala en proporción; se redondea hacia abajo.
        const size = Math.floor(((base * available) / needed) * 10) / 10;
        if (size < this.appFitLineMin()) {
          host.style.whiteSpace = '';
          return;
        }
        host.style.fontSize = `${size}px`;
      };

      const resize = new ResizeObserver(fit);
      resize.observe(host);
      const content = new MutationObserver(fit);
      content.observe(host, { characterData: true, childList: true, subtree: true });
      document.fonts?.ready.then(fit);

      destroyRef.onDestroy(() => {
        resize.disconnect();
        content.disconnect();
      });
    });
  }
}
