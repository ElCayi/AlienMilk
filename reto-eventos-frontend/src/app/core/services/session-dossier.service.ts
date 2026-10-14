import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import { buildSessionDossier } from '../../features/sessions/session-dossier';
import { EventoDetalle } from '../../models/api.models';
import { SessionDossier, SessionDossierSource } from '../../models/session-dossier.models';

const EMPTY_SOURCE: SessionDossierSource = { general: {}, porTipo: {}, porSesion: {} };

/**
 * Expedientes de las sesiones: sus capas llegan del backend (`GET /api/eventos/expedientes`), donde se
 * editan desde el panel de administración, y aquí se componen para cada sesión.
 */
@Injectable({ providedIn: 'root' })
export class SessionDossierService {
  private readonly http = inject(HttpClient);

  private readonly source$ = this.http.get<SessionDossierSource>(`${environment.apiUrl}/eventos/expedientes`).pipe(
    // Sin contenido editorial la ficha sigue funcionando con los datos de la API.
    catchError(() => of(EMPTY_SOURCE)),
    shareReplay(1),
  );

  getDossier(session: EventoDetalle): Observable<SessionDossier> {
    return this.source$.pipe(map((source) => buildSessionDossier(session, source)));
  }
}
