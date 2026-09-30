import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Estacion } from '../../models/station.models';

/**
 * Proveedor provisional de la red de estaciones. Cuando exista `GET /api/estaciones`, basta con
 * cambiar la URL: la página no necesita saber de dónde procede el catálogo.
 */
@Injectable({ providedIn: 'root' })
export class StationService {
  private readonly http = inject(HttpClient);

  getEstaciones(): Observable<Estacion[]> {
    return this.http.get<Estacion[]>('data/stations.json');
  }
}
