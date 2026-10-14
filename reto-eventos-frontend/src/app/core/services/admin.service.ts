import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EventoAdmin,
  EventoPayload,
  Perfil,
  PerfilPayload,
  Reserva,
  ResumenAdmin,
  TipoEvento,
  TipoEventoPayload,
  Usuario,
  UsuarioPayload,
} from '../../models/api.models';
import { SessionDossierLayer, SessionDossierSource } from '../../models/session-dossier.models';

/** De quién es una capa del expediente: la común, la de un tipo o la de una sesión. */
export type ExpedienteAmbito = { tipo: 'general' } | { tipo: 'tipo' | 'sesion'; id: number };

/**
 * Panel de administración: sesiones, reservas, cuentas, tipos y perfiles. Las reglas (qué se puede
 * borrar, qué estado tiene cada sesión) las decide el servidor; el panel enseña lo que responde.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = `${environment.apiUrl}/admin`;

  getResumen(): Observable<ResumenAdmin> {
    return this.http.get<ResumenAdmin>(`${this.adminUrl}/resumen`);
  }

  getEventos(): Observable<EventoAdmin[]> {
    return this.http.get<EventoAdmin[]>(`${this.adminUrl}/eventos`);
  }

  crearEvento(payload: EventoPayload): Observable<EventoAdmin> {
    return this.http.post<EventoAdmin>(`${this.adminUrl}/eventos`, payload);
  }

  actualizarEvento(idEvento: number, payload: EventoPayload): Observable<EventoAdmin> {
    return this.http.put<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}`, payload);
  }

  cancelarEvento(idEvento: number): Observable<EventoAdmin> {
    return this.http.patch<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}/cancelar`, {});
  }

  /** Archiva una sesión que ya no está activa: sale de la lista y queda en «Archivadas». */
  archivarEvento(idEvento: number): Observable<EventoAdmin> {
    return this.http.patch<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}/archivar`, {});
  }

  desarchivarEvento(idEvento: number): Observable<EventoAdmin> {
    return this.http.patch<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}/desarchivar`, {});
  }

  reactivarEvento(idEvento: number): Observable<EventoAdmin> {
    return this.http.patch<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}/reactivar`, {});
  }

  /** Con reservas, el servidor solo la borra si se confirma aparte (`conReservas`): se van con ella. */
  borrarEvento(idEvento: number, conReservas = false): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/eventos/${idEvento}`, {
      params: conReservas ? { conReservas: true } : {},
    });
  }

  /** Sube la foto propia de la sesión (JPG, PNG o WebP, hasta 5 MB); sustituye la anterior. */
  subirFotoEvento(idEvento: number, archivo: File): Observable<EventoAdmin> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}/imagen`, datos);
  }

  /** Quita la foto propia: la sesión vuelve a la de la web. */
  quitarFotoEvento(idEvento: number): Observable<EventoAdmin> {
    return this.http.delete<EventoAdmin>(`${this.adminUrl}/eventos/${idEvento}/imagen`);
  }

  /** Todas las capas del expediente, las mismas que lee la ficha pública. */
  getExpedientes(): Observable<SessionDossierSource> {
    return this.http.get<SessionDossierSource>(`${environment.apiUrl}/eventos/expedientes`);
  }

  /** Guarda una capa entera; vacía, se borra y su ámbito vuelve a heredarlo todo. */
  guardarExpediente(ambito: ExpedienteAmbito, capa: SessionDossierLayer): Observable<SessionDossierLayer> {
    const ruta =
      ambito.tipo === 'general'
        ? 'general'
        : ambito.tipo === 'tipo'
          ? `tipos/${ambito.id}`
          : `sesiones/${ambito.id}`;
    return this.http.put<SessionDossierLayer>(`${this.adminUrl}/expedientes/${ruta}`, capa);
  }

  /** Devuelve la demo a su estado de fábrica: borra todo lo creado o cambiado. */
  restaurarFabrica(): Observable<void> {
    return this.http.post<void>(`${this.adminUrl}/fabrica`, {});
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.adminUrl}/usuarios`);
  }

  crearUsuario(payload: UsuarioPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.adminUrl}/usuarios`, payload);
  }

  actualizarUsuario(username: string, payload: UsuarioPayload): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${this.adminUrl}/usuarios/${encodeURIComponent(username)}`,
      payload,
    );
  }

  borrarUsuario(username: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/usuarios/${encodeURIComponent(username)}`);
  }

  getTipos(): Observable<TipoEvento[]> {
    return this.http.get<TipoEvento[]>(`${this.adminUrl}/tipos-evento`);
  }

  crearTipo(payload: TipoEventoPayload): Observable<TipoEvento> {
    return this.http.post<TipoEvento>(`${this.adminUrl}/tipos-evento`, payload);
  }

  actualizarTipo(idTipo: number, payload: TipoEventoPayload): Observable<TipoEvento> {
    return this.http.put<TipoEvento>(`${this.adminUrl}/tipos-evento/${idTipo}`, payload);
  }

  borrarTipo(idTipo: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/tipos-evento/${idTipo}`);
  }

  getPerfiles(): Observable<Perfil[]> {
    return this.http.get<Perfil[]>(`${this.adminUrl}/perfiles`);
  }

  crearPerfil(payload: PerfilPayload): Observable<Perfil> {
    return this.http.post<Perfil>(`${this.adminUrl}/perfiles`, payload);
  }

  actualizarPerfil(idPerfil: number, payload: PerfilPayload): Observable<Perfil> {
    return this.http.put<Perfil>(`${this.adminUrl}/perfiles/${idPerfil}`, payload);
  }

  borrarPerfil(idPerfil: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/perfiles/${idPerfil}`);
  }

  /** Todas las reservas, de la sesión más reciente a la más antigua. */
  getReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.adminUrl}/reservas`);
  }

  crearReservaParaUsuario(
    username: string,
    idEvento: number,
    payload: { cantidad: number; observaciones: string },
  ): Observable<Reserva> {
    return this.http.post<Reserva>(
      `${this.adminUrl}/reservas/usuario/${encodeURIComponent(username)}/evento/${idEvento}`,
      payload,
    );
  }

  cancelarReservaAdmin(idReserva: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/reservas/${idReserva}`);
  }
}
