import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser, RegisterPayload, Usuario } from '../../models/api.models';

export interface DemoAccount {
  username: string;
  password: string;
  perfil: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly authHeaderKey = 'reto-eventos-basic-auth';

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.perfil === 'ROLE_ADMON');

  loadSession(): Observable<AuthUser> | null {
    if (!this.getAuthorizationHeader()) {
      return null;
    }

    return this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).pipe(
      tap({
        next: (user) => this.currentUser.set(user),
        error: () => this.logout(),
      }),
    );
  }

  login(username: string, password: string): Observable<AuthUser> {
    const encoded = btoa(`${username}:${password}`);
    localStorage.setItem(this.authHeaderKey, `Basic ${encoded}`);

    return this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).pipe(
      tap({
        next: (user) => this.currentUser.set(user),
        error: () => this.logout(),
      }),
    );
  }

  demoAccounts(): Observable<DemoAccount[]> {
    return this.http.get<DemoAccount[]>(`${this.apiUrl}/auth/demo-accounts`);
  }

  register(payload: RegisterPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/auth/register`, payload);
  }

  logout(): void {
    localStorage.removeItem(this.authHeaderKey);
    this.currentUser.set(null);
  }

  getAuthorizationHeader(): string | null {
    return localStorage.getItem(this.authHeaderKey);
  }
}
