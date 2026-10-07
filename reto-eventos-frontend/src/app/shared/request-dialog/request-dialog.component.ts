import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { RequestFormComponent } from '../request-form/request-form.component';

/**
 * Abre un formulario del molde en un diálogo nativo (`<dialog>`): foco atrapado, Escape para cerrar
 * y el resto de la página inerte. El formulario se carga la primera vez que se abre y conserva lo
 * escrito si se cierra sin enviar; tras un envío, vuelve a estar vacío.
 */
@Component({
  selector: 'app-request-dialog',
  standalone: true,
  imports: [RequestFormComponent],
  templateUrl: './request-dialog.component.html',
  styleUrl: './request-dialog.component.css',
})
export class RequestDialogComponent {
  readonly formKey = input.required<string>();

  readonly opened = signal(false);
  readonly sent = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly form = viewChild(RequestFormComponent);
  private readonly destroyRef = inject(DestroyRef);

  headingId(): string {
    return `${this.formKey()}-title`;
  }

  open(): void {
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  /** Al cerrar (botón, Escape o clic fuera), un formulario ya enviado vuelve a empezar. */
  onClose(): void {
    if (this.sent()) {
      this.form()?.reset();
      this.sent.set(false);
    }
  }

  constructor() {
    // Un clic en el fondo oscuro, fuera del panel, cierra el diálogo. Es un atajo para el ratón: con
    // teclado se cierra con Escape o con el botón, así que no va en la plantilla como acción propia.
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;
      const onClick = (event: MouseEvent) => {
        if (event.target === dialog) {
          this.close();
        }
      };
      dialog.addEventListener('click', onClick);
      this.destroyRef.onDestroy(() => dialog.removeEventListener('click', onClick));
    });
  }
}
