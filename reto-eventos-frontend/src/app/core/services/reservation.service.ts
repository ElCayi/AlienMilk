import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RegistroAsistencia, Reserva, ReservaEditar } from '../../models/api.models';

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

  /** Corregir el teléfono o los participantes, hasta el día anterior a la sesión. */
  editar(idReserva: number, datos: ReservaEditar): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}/${idReserva}/datos`, datos);
  }

  cancelar(idReserva: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idReserva}`);
  }
}
