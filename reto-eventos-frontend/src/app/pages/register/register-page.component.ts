import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

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

  nombre = '';
  apellidos = '';
  email = '';
  username = '';
  direccion = '';
  password = '';

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      username: this.username,
      password: this.password,
      email: this.email,
      nombre: this.nombre,
      apellidos: this.apellidos,
      direccion: this.direccion,
    }).subscribe({
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
