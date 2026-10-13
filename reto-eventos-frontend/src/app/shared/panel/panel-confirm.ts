import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  Injectable,
  Injector,
  signal,
  viewChild,
} from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** El texto del botón que confirma: «Borrar sesión», «Cancelar reserva»… */
  confirm: string;
  /** Si borra o anula algo: el botón va en coral. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * Confirmaciones de los paneles, en lugar del `confirm()` del navegador: con el estilo de la web y
 * diciendo qué pasará. Una sola a la vez; la caja la pinta `<app-panel-confirm>`, en el armazón.
 */
@Injectable({ providedIn: 'root' })
export class PanelConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...options, resolve }));
  }

  answer(confirmed: boolean): void {
    const pending = this.pending();
    this.pending.set(null);
    pending?.resolve(confirmed);
  }
}

@Component({
  selector: 'app-panel-confirm',
  standalone: true,
  template: `
    <dialog
      #dialog
      class="panel-dialog panel-confirm"
      role="alertdialog"
      aria-labelledby="panel-confirm-title"
      aria-describedby="panel-confirm-text"
      (close)="confirmService.answer(false)"
    >
      @if (confirmService.pending(); as pending) {
        <div class="panel-confirm-body">
          <h2 id="panel-confirm-title">{{ pending.title }}</h2>
          <p id="panel-confirm-text">{{ pending.message }}</p>
          <div class="form-actions">
            <button type="button" class="btn" autofocus (click)="dialog.close()">Volver</button>
            <button
              type="button"
              class="btn btn-primary"
              [class.btn-danger-fill]="pending.danger"
              (click)="confirmService.answer(true); dialog.close()"
            >
              {{ pending.confirm }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
  styleUrls: ['./panel.css', './panel-dialog.component.css', './panel-confirm.css'],
})
export class PanelConfirmComponent {
  readonly confirmService = inject(PanelConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.confirmService.pending() && !dialog.open) {
        dialog.showModal();
        // El foco, en «Volver»: con Intro no se borra nada por descuido.
        afterNextRender(() => dialog.querySelector<HTMLElement>('[autofocus]')?.focus(), {
          injector: this.injector,
        });
      }
    });
  }
}
