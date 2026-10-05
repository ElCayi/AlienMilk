import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

// Built on the login page: its styles are a verbatim copy of the login's,
// followed by the few registration-specific additions.
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css',
})
export class RegisterPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  username = '';
  password = '';
  passwordRepeat = '';

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  /** The mismatch warning waits until the visitor leaves the field or submits. */
  readonly repeatTouched = signal(false);

  mismatch(): boolean {
    return this.repeatTouched() && this.passwordRepeat !== '' && this.password !== this.passwordRepeat;
  }

  submit(): void {
    if (this.loading()) return;
    this.repeatTouched.set(true);
    if (this.password !== this.passwordRepeat) return;
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService
      .register({
        username: this.username,
        password: this.password,
        email: this.email,
      })
      .subscribe({
        next: () => {
          this.authService.login(this.username, this.password).subscribe({
            next: () => {
              this.loading.set(false);
              this.router.navigateByUrl('/reservas');
            },
            error: () => {
              this.loading.set(false);
              this.router.navigateByUrl('/login');
            },
          });
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(error?.error?.message ?? 'No se ha podido crear la cuenta.');
        },
      });
  }
}
