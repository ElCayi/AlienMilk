import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { buildSessionDossier } from '../../features/sessions/session-dossier';
import { EventoDetalle } from '../../models/api.models';
import { SessionDossier, SessionDossierLayer } from '../../models/session-dossier.models';

/**
 * El expediente de cada sesión, del backend (`GET /api/eventos/{id}/expediente`), completado para la
 * ficha pública.
 */
@Injectable({ providedIn: 'root' })
export class SessionDossierService {
  private readonly http = inject(HttpClient);

  getDossier(session: EventoDetalle): Observable<SessionDossier> {
    return this.http.get<SessionDossierLayer>(`${environment.apiUrl}/eventos/${session.idEvento}/expediente`).pipe(
      // Sin contenido editorial la ficha sigue funcionando con los datos de la API.
      catchError(() => of(null)),
      map((stored) => buildSessionDossier(session, stored)),
    );
  }
}
