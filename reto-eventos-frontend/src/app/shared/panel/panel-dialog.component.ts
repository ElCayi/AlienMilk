import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Diálogo de los paneles: un `<dialog>` nativo con su título y el botón de cerrar; el contenido (un
 * formulario, casi siempre) lo pone quien lo usa. Foco atrapado, Escape para cerrar y el resto de la
 * página inerte. No se cierra al pulsar fuera: un formulario a medias no se pierde por un clic.
 */
@Component({
  selector: 'app-panel-dialog',
  standalone: true,
  template: `
    <dialog #dialog class="panel-dialog" [class.is-wide]="wide()" [class.is-tall]="tall()" [class.is-huge]="huge()" [attr.aria-labelledby]="headingId" (close)="closed.emit()" (cancel)="onCancel($event)" [attr.closedby]="beforeClose() ? 'none' : null">
      <div class="panel-dialog-head">
        <h2 [id]="headingId">{{ heading() }}</h2>
        <button type="button" class="panel-dialog-close" aria-label="Cerrar" (click)="requestClose()">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div class="panel-dialog-body">
        <ng-content />
      </div>
    </dialog>
  `,
  styleUrl: './panel-dialog.component.css',
})
export class PanelDialogComponent {
  readonly heading = input.required<string>();
  /** Más ancho, para formularios de dos columnas largos. */
  readonly wide = input(false);
  /** Alto fijo, para diálogos con pestañas: cambiar de pestaña no lo encoge ni lo mueve. */
  readonly tall = input(false);
  /** Casi toda la pantalla, para lo que antes era una página aparte (la hoja de control). */
  readonly huge = input(false);
  /**
   * Antes de cerrar con la ✕ o con Esc: si devuelve false, el diálogo se queda abierto (hay cambios sin
   * guardar y no se quieren perder). Cerrar desde el código (tras guardar) no pregunta.
   */
  readonly beforeClose = input<(() => boolean | Promise<boolean>) | null>(null);
  readonly closed = output<void>();

  readonly headingId = `panel-dialog-${++nextId}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly injector = inject(Injector);

  /** Abre el diálogo y, cuando el contenido ya está al día, pone el foco en su primer campo. */
  open(): void {
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
    afterNextRender(
      () =>
        dialog
          .querySelector<HTMLElement>(
            '.panel-dialog-body :is(input, select, textarea):not([disabled]):not([type=hidden])',
          )
          ?.focus(),
      { injector: this.injector },
    );
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  /** La ✕: cierra, salvo que beforeClose diga que no. */
  async requestClose(): Promise<void> {
    const guard = this.beforeClose();
    if (!guard || (await guard())) {
      this.close();
    }
  }

  /**
   * Esc, con guardia: el navegador cerraría sin preguntar. Con closedby="none" ya no cierra solo (Chrome no
   * siempre deja parar el evento cancel), y aquí se hace como con la ✕. Donde closedby no exista, se para
   * el cancel.
   */
  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.beforeClose()) {
      event.preventDefault();
      void this.requestClose();
    }
  }

  onCancel(event: Event): void {
    if (this.beforeClose()) {
      event.preventDefault();
    }
  }
}
