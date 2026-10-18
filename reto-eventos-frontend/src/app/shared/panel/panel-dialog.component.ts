import {
  afterNextRender,
  Component,
  ElementRef,
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
    <dialog #dialog class="panel-dialog" [class.is-wide]="wide()" [class.is-tall]="tall()" [class.is-huge]="huge()" [attr.aria-labelledby]="headingId" (close)="closed.emit()">
      <div class="panel-dialog-head">
        <h2 [id]="headingId">{{ heading() }}</h2>
        <button type="button" class="panel-dialog-close" aria-label="Cerrar" (click)="close()">
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
}
