import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

// Sketch: the login page duplicated with the registration content, served at
// /registro-sketch to compare with /registro before replacing it. Styles are
// a verbatim copy of the login page's.
@Component({
  selector: 'app-register-sketch-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-sketch-page.component.html',
  styleUrl: './register-sketch-page.component.css',
})
export class RegisterSketchPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  username = '';
  password = '';

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  submit(): void {
    if (this.loading()) return;
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
