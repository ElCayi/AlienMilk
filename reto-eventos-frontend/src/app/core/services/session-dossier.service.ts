import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { buildSessionDossier } from '../../features/sessions/session-dossier';
import { EventoDetalle } from '../../models/api.models';
import { SessionDossier, SessionDossierSource } from '../../models/session-dossier.models';

const EMPTY_SOURCE: SessionDossierSource = { general: {}, porTipo: {}, porSesion: {} };

/**
 * Proveedor provisional de expedientes. Cuando exista `GET /api/eventos/{id}/expediente`, basta con
 * que `getDossier` lo consulte: la página no necesita saber de dónde procede el contenido.
 */
@Injectable({ providedIn: 'root' })
export class SessionDossierService {
  private readonly http = inject(HttpClient);

  private readonly source$ = this.http.get<SessionDossierSource>('data/session-dossiers.json').pipe(
    // Sin contenido editorial la ficha sigue funcionando con los datos de la API.
    catchError(() => of(EMPTY_SOURCE)),
    shareReplay(1),
  );

  getDossier(session: EventoDetalle): Observable<SessionDossier> {
    return this.source$.pipe(map((source) => buildSessionDossier(session, source)));
  }
}
