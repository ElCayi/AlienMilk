import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EstadoSolicitud,
  FormularioDefinicion,
  Solicitud,
  SolicitudPayload,
  SolicitudRecibida,
} from '../../models/api.models';

/** Formularios públicos (definición y envío) y su bandeja en el panel de admin. */
@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly formsUrl = `${environment.apiUrl}/formularios`;
  private readonly adminUrl = `${environment.apiUrl}/admin/solicitudes`;
  /** Las definiciones no cambian mientras la página está abierta: se piden una vez por formulario. */
  private readonly definitions = new Map<string, Observable<FormularioDefinicion>>();

  definition(formKey: string): Observable<FormularioDefinicion> {
    let definition = this.definitions.get(formKey);
    if (!definition) {
      definition = this.http.get<FormularioDefinicion>(`${this.formsUrl}/${formKey}`).pipe(
        // Si falla, se olvida para que el siguiente intento vuelva a pedirla.
        catchError((error: unknown) => {
          this.definitions.delete(formKey);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.definitions.set(formKey, definition);
    }
    return definition;
  }

  send(formKey: string, payload: SolicitudPayload): Observable<SolicitudRecibida> {
    return this.http.post<SolicitudRecibida>(`${this.formsUrl}/${formKey}/solicitudes`, payload);
  }

  list(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(this.adminUrl);
  }

  setStatus(idSolicitud: number, estado: EstadoSolicitud): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.adminUrl}/${idSolicitud}`, { estado });
  }

  remove(idSolicitud: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${idSolicitud}`);
  }
}
