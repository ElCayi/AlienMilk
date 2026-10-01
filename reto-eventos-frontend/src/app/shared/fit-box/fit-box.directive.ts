import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Escala un bloque entero (letra, rellenos, bordes) para que llene el alto de su contenedor sin
 * desbordarlo: en pantallas bajas se reduce y en pantallas grandes crece, así ocupa siempre la misma
 * proporción. Se aplica a un envoltorio que es el único hijo del contenedor de alto fijo.
 *
 * Solo actúa mientras se cumple `appFitBoxMedia`; fuera de ella el bloque queda a su tamaño natural.
 */
@Directive({ selector: '[appFitBox]' })
export class FitBoxDirective {
  readonly appFitBoxMedia = input('(min-width: 1001px)');
  readonly appFitBoxMin = input(0.6);
  readonly appFitBoxMax = input(1.6);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const parent = host.parentElement;
      if (!parent) {
        return;
      }
      const media = window.matchMedia(this.appFitBoxMedia());
      let frame = 0;

      const reset = () => {
        host.style.zoom = '';
        host.style.width = '';
        host.style.minHeight = '';
      };

      const fit = () => {
        frame = 0;
        reset();
        if (!media.matches) {
          return;
        }
        const styles = getComputedStyle(parent);
        const width =
          parent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
        const height =
          parent.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
        if (width <= 0 || height <= 0) {
          return;
        }
        // Al escalar cambia el ancho disponible y el texto salta de línea, así que el alto no es
        // proporcional a la escala: se busca por bisección la mayor escala con la que todo cabe.
        const apply = (zoom: number) => {
          host.style.width = `${width / zoom}px`;
          host.style.zoom = String(zoom);
          return host.getBoundingClientRect().height;
        };
        let low = this.appFitBoxMin();
        let high = this.appFitBoxMax();
        if (apply(high) <= height) {
          host.style.minHeight = `${height / high}px`;
          return;
        }
        for (let pass = 0; pass < 12 && high - low > 0.002; pass++) {
          const mid = (low + high) / 2;
          if (apply(mid) <= height) {
            low = mid;
          } else {
            high = mid;
          }
        }
        apply(low);
        // El sobrante del último salto de línea se reparte: el bloque llena exactamente el alto.
        host.style.minHeight = `${height / low}px`;
      };

      const schedule = () => {
        if (!frame) {
          frame = requestAnimationFrame(fit);
        }
      };

      // Solo cuenta que cambie el contenedor: el propio ajuste no debe volver a dispararlo.
      let size = '';
      const resize = new ResizeObserver(() => {
        const next = `${parent.clientWidth}x${parent.clientHeight}`;
        if (next !== size) {
          size = next;
          schedule();
        }
      });
      resize.observe(parent);
      const content = new MutationObserver(schedule);
      content.observe(host, { characterData: true, childList: true, subtree: true });
      media.addEventListener('change', schedule);
      document.fonts?.ready.then(schedule);
      schedule();

      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        content.disconnect();
        media.removeEventListener('change', schedule);
      });
    });
  }
}
