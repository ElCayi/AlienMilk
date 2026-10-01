import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Escala un bloque entero en proporción a su ancho disponible: hasta `appScaleWidth` (px) se ve a su
 * tamaño natural; por encima, todo (letra, rellenos, imagen) crece a la vez, de modo que en pantallas
 * grandes ocupa los mismos espacios relativos que en un portátil, hasta `appScaleWidthMax`.
 */
@Directive({ selector: '[appScaleWidth]' })
export class ScaleWidthDirective {
  readonly appScaleWidth = input.required<number>();
  readonly appScaleWidthMax = input(1.08);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const parent = host.parentElement;
      if (!parent) {
        return;
      }

      let width = 0;
      const fit = () => {
        const styles = getComputedStyle(parent);
        const available =
          parent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
        if (available === width) {
          return;
        }
        width = available;
        const zoom = Math.min(
          this.appScaleWidthMax(),
          Math.max(1, available / this.appScaleWidth()),
        );
        host.style.zoom = zoom === 1 ? '' : String(zoom);
        // Pasado el tope de escala deja de ensancharse: queda centrado, con aire a los lados.
        host.style.width =
          zoom === 1 ? '' : `${Math.min(available / zoom, this.appScaleWidth())}px`;
        host.style.marginInline = zoom === 1 ? '' : 'auto';
      };

      const resize = new ResizeObserver(fit);
      resize.observe(parent);
      destroyRef.onDestroy(() => resize.disconnect());
    });
  }
}
