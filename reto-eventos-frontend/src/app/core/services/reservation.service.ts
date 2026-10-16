import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RegistroAsistencia, Reserva } from '../../models/api.models';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reservas`;

  getMine(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/mias`);
  }

  /** Reserva con su registro de asistencia (ver la página Registro de asistencia). */
  registrar(idEvento: number, registro: RegistroAsistencia): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.apiUrl}/evento/${idEvento}`, registro);
  }

  cancelar(idReserva: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idReserva}`);
  }
}
