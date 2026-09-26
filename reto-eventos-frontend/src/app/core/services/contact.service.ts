import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Contacto, ContactoPayload } from '../../models/api.models';

/**
 * Ficha de contacto de la sede. La comparten la página de contacto y el pie, así que se pide una
 * vez y se guarda en una señal; al editarla desde el admin, la señal se actualiza con la respuesta.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  readonly contacto = signal<Contacto | null>(null);
  readonly error = signal(false);

  private pending = false;

  load(force = false): void {
    if (this.pending || (this.contacto() && !force)) {
      return;
    }

    this.pending = true;
    this.error.set(false);
    this.http.get<Contacto>(`${environment.apiUrl}/contacto`).subscribe({
      next: (contacto) => {
        this.contacto.set(contacto);
        this.pending = false;
      },
      error: () => {
        this.error.set(true);
        this.pending = false;
      },
    });
  }

  update(payload: ContactoPayload): Observable<Contacto> {
    return this.http
      .put<Contacto>(`${environment.apiUrl}/admin/contacto`, payload)
      .pipe(tap((contacto) => this.contacto.set(contacto)));
  }
}
