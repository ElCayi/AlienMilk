import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import { errorMessage, fieldErrors, profileLabel } from '../../../shared/panel/panel-format';
import { AccountStore } from '../account-store';
import { SectionHelpComponent } from '../../../shared/panel/section-help.component';

/**
 * La cuenta: sus datos y, al final, borrarla. Lo puede hacer un cliente, con su contraseña como
 * confirmación; una cuenta de administración solo la gestiona otra cuenta de administración.
 */
@Component({
  selector: 'app-account-profile-panel',
  standalone: true,
  imports: [SectionHelpComponent, FormsModule, RouterLink, PanelDialogComponent],
  templateUrl: './account-profile-panel.component.html',
  styleUrls: ['../../../shared/panel/panel.css', './account-profile-panel.component.css'],
})
export class AccountProfilePanelComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly store = inject(AccountStore);

  readonly user = this.auth.currentUser;
  readonly isAdmin = this.auth.isAdmin;
  readonly profile = profileLabel;

  /** Pedidos que aún no han terminado: mientras haya alguno, la cuenta no se puede borrar. */
  readonly ordersInProgress = this.store.ordersInProgress;
  readonly activeReservations = this.store.activeReservations;
  readonly blocked = computed(() => this.isAdmin() || this.ordersInProgress() > 0);

  readonly dialog = viewChild.required(PanelDialogComponent);
  readonly savingProgramme = signal(false);
  readonly programmeNotice = signal<{ text: string; error: boolean } | null>(null);

  setProgramme(acepta: boolean): void {
    this.savingProgramme.set(true);
    this.programmeNotice.set(null);
    this.auth.setProgramme(acepta).subscribe({
      next: () => {
        this.savingProgramme.set(false);
        this.programmeNotice.set({
          text: acepta ? 'Recibirá el programa de cada ciclo.' : 'Ya no recibirá el programa.',
          error: false,
        });
      },
      error: () => {
        this.savingProgramme.set(false);
        this.programmeNotice.set({ text: 'No se ha podido guardar. Inténtelo de nuevo.', error: true });
      },
    });
  }

  readonly deleting = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  password = '';

  openDelete(): void {
    this.password = '';
    this.passwordError.set(null);
    this.formError.set(null);
    this.dialog().open();
  }

  confirmDelete(): void {
    if (this.deleting()) {
      return;
    }
    if (!this.password) {
      this.passwordError.set('Escribe tu contraseña para confirmar');
      return;
    }
    this.deleting.set(true);
    this.passwordError.set(null);
    this.formError.set(null);
    this.auth.deleteAccount(this.password).subscribe({
      next: () => {
        this.dialog().close();
        this.auth.logout();
        void this.router.navigate(['/'], { replaceUrl: true });
      },
      error: (error) => {
        this.deleting.set(false);
        const errors = fieldErrors(error);
        if (errors['password']) {
          this.passwordError.set(errors['password']);
        } else {
          this.formError.set(errorMessage(error, 'No se ha podido borrar la cuenta.'));
        }
      },
    });
  }
}
