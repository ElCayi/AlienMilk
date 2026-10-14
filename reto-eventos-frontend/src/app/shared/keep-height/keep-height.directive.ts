import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, OnChanges, SimpleChanges } from '@angular/core';

/**
 * Para listas con filtros y filas que se despliegan, que la vista no salte cuando la lista encoge.
 * Dos causas:
 *
 * - El navegador ancla la posición a una fila visible (scroll anchoring); si el filtro la quita, coge
 *   otra y mueve la página para seguirla. La lista queda fuera de esa elección (`overflow-anchor`).
 * - Si la página se acorta más allá de lo que se ve, el navegador sube la vista para no quedarse más
 *   allá del final. Al cambiar el filtro (el valor de `appKeepHeight`) o al pulsar dentro (plegar una
 *   fila), el bloque guarda su altura, pero solo la que hace falta para que la vista no se mueva: lo
 *   que va debajo sube en cuanto cabe, y al volver hacia arriba se va soltando el resto.
 */
@Directive({ selector: '[appKeepHeight]' })
export class KeepHeightDirective implements OnChanges {
  /** Lo que filtra la lista: cada vez que cambia, se guarda la altura. */
  readonly appKeepHeight = input<unknown>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private height = 0;
  private frame = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.host.style.overflowAnchor = 'none';

    afterNextRender(() => {
      let width = this.host.clientWidth;
      const resize = new ResizeObserver(() => {
        if (this.host.clientWidth !== width) {
          width = this.host.clientWidth;
          this.host.style.minHeight = '';
        }
        this.height = this.host.getBoundingClientRect().height;
        this.schedule();
      });
      resize.observe(this.host);
      // Con la altura guardada el bloque no cambia de tamaño al quitar filas: se mira lo de dentro.
      const rows = new MutationObserver(() => this.schedule());
      rows.observe(this.host, { childList: true, subtree: true });
      // Antes de que una fila se pliegue (el clic llega aquí antes de que Angular la quite).
      const hold = () => this.hold();
      const settle = () => this.schedule(true);
      this.host.addEventListener('click', hold, true);
      window.addEventListener('scroll', settle, { passive: true });
      destroyRef.onDestroy(() => {
        resize.disconnect();
        rows.disconnect();
        cancelAnimationFrame(this.frame);
        this.host.removeEventListener('click', hold, true);
        window.removeEventListener('scroll', settle);
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['appKeepHeight'].firstChange) {
      this.hold();
    }
  }

  private hold(): void {
    if (this.height) {
      this.host.style.minHeight = `${this.height}px`;
      this.schedule();
    }
  }

  private schedule(scrolling = false): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.settle(scrolling));
  }

  /**
   * Suelta toda la altura guardada que se pueda sin que la página quede más corta que lo que se ve.
   * Al desplazarse, en cambio, solo de una vez y cuando el hueco ya no se ve: soltarla poco a poco
   * dejaría lo de debajo quieto en la pantalla, como pegado.
   */
  private settle(scrolling: boolean): void {
    const held = parseFloat(this.host.style.minHeight);
    if (!held) {
      return;
    }
    const natural = this.naturalHeight();
    if (scrolling) {
      if (this.host.getBoundingClientRect().top + natural >= window.innerHeight) {
        this.host.style.minHeight = '';
      }
      return;
    }
    // Lo que sobra de página por debajo de lo que se ve: eso es lo que puede encoger sin mover la vista.
    const below = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    const keep = Math.max(natural, this.host.getBoundingClientRect().height - Math.max(0, below));
    if (natural > held + 0.5) {
      // Ha crecido (una fila desplegada): lo guardado ya no hace falta.
      this.host.style.minHeight = '';
    } else if (keep < held - 0.5) {
      // Puede encoger algo. Si aún mide lo mismo (la fila no se ha quitado todavía), se espera.
      this.host.style.minHeight = keep > natural + 0.5 ? `${keep}px` : '';
    }
  }

  /**
   * La altura sin la guardada, medida por lo que tiene dentro: quitarla un momento para medir haría
   * que el navegador recortase la vista en ese instante.
   */
  private naturalHeight(): number {
    const box = this.host.getBoundingClientRect();
    const style = getComputedStyle(this.host);
    let bottom = box.top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth);
    for (const child of Array.from(this.host.children)) {
      bottom = Math.max(bottom, child.getBoundingClientRect().bottom + parseFloat(getComputedStyle(child).marginBottom));
    }
    return bottom - box.top + parseFloat(style.paddingBottom) + parseFloat(style.borderBottomWidth);
  }
}
