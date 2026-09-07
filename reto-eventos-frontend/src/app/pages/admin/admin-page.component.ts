import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminService } from '../../core/services/admin.service';
import {
  EventoListado,
  EventoPayload,
  Perfil,
  PerfilPayload,
  TipoEvento,
  TipoEventoPayload,
  Usuario,
  UsuarioPayload,
} from '../../models/api.models';
import { AdminProfilesPanelComponent } from './panels/admin-profiles-panel.component';
import { AdminSessionsPanelComponent } from './panels/admin-sessions-panel.component';
import { AdminTypesPanelComponent } from './panels/admin-types-panel.component';
import { AdminUsersPanelComponent } from './panels/admin-users-panel.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AdminSessionsPanelComponent,
    AdminUsersPanelComponent,
    AdminTypesPanelComponent,
    AdminProfilesPanelComponent,
  ],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AdminPageComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly eventos = signal<EventoListado[]>([]);
  readonly usuarios = signal<Usuario[]>([]);
  readonly tipos = signal<TipoEvento[]>([]);
  readonly perfiles = signal<Perfil[]>([]);
  readonly feedback = signal('');
  readonly activeTab = signal<'sesiones' | 'usuarios' | 'tipos' | 'perfiles'>('sesiones');

  setTab(tab: 'sesiones' | 'usuarios' | 'tipos' | 'perfiles'): void {
    this.activeTab.set(tab);
    this.feedback.set('');
  }

  eventoEditandoId: number | null = null;
  usuarioEditandoUsername: string | null = null;
  tipoEditandoId: number | null = null;
  perfilEditandoId: number | null = null;

  eventoForm: EventoPayload = this.nuevoEventoForm();
  usuarioForm: UsuarioPayload = this.nuevoUsuarioForm();
  tipoForm: TipoEventoPayload = this.nuevoTipoForm();
  perfilForm: PerfilPayload = this.nuevoPerfilForm();

  ngOnInit(): void {
    this.reloadAll();
  }

  guardarEvento(): void {
    if (!this.eventoForm.idTipo) {
      this.feedback.set('Selecciona un tipo de evento.');
      return;
    }

    const request =
      this.eventoEditandoId === null
        ? this.adminService.crearEvento(this.eventoForm)
        : this.adminService.actualizarEvento(this.eventoEditandoId, this.eventoForm);

    request.subscribe({
      next: () => {
        this.feedback.set(
          this.eventoEditandoId === null ? 'Sesion creada correctamente.' : 'Sesion actualizada correctamente.',
        );
        this.cancelarEdicionEvento();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido guardar la sesion.'),
    });
  }

  editarEvento(idEvento: number): void {
    this.adminService.getEvento(idEvento).subscribe({
      next: (evento) => {
        this.eventoEditandoId = evento.idEvento;
        this.eventoForm = {
          nombre: evento.nombre,
          descripcion: evento.descripcion,
          fechaInicio: evento.fechaInicio,
          duracion: evento.duracion,
          direccion: evento.direccion,
          estado: evento.estado,
          aforoMaximo: evento.aforoMaximo,
          minimoAsistencia: evento.minimoAsistencia,
          precio: evento.precio,
          idTipo: evento.idTipo,
        };
        this.cdr.markForCheck();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido cargar la sesion.'),
    });
  }

  cancelarEdicionEvento(): void {
    this.eventoEditandoId = null;
    this.eventoForm = this.nuevoEventoForm();
  }

  borrarEvento(idEvento: number): void {
    if (!confirm('¿Borrar esta sesion?')) {
      return;
    }

    this.adminService.borrarEvento(idEvento).subscribe({
      next: () => {
        this.feedback.set('Sesion borrada.');
        this.cancelarEdicionEvento();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido borrar la sesion.'),
    });
  }

  guardarUsuario(): void {
    if (!this.usuarioForm.idPerfil) {
      this.feedback.set('Selecciona un perfil.');
      return;
    }

    const request =
      this.usuarioEditandoUsername === null
        ? this.adminService.crearUsuario(this.usuarioForm)
        : this.adminService.actualizarUsuario(this.usuarioEditandoUsername, this.usuarioForm);

    request.subscribe({
      next: () => {
        this.feedback.set(
          this.usuarioEditandoUsername === null
            ? 'Usuario creado correctamente.'
            : 'Usuario actualizado correctamente.',
        );
        this.cancelarEdicionUsuario();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido guardar el usuario.'),
    });
  }

  editarUsuario(usuario: Usuario): void {
    this.usuarioEditandoUsername = usuario.username;
    this.usuarioForm = {
      username: usuario.username,
      password: '',
      email: usuario.email,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      direccion: usuario.direccion,
      enabled: usuario.enabled,
      fechaRegistro: usuario.fechaRegistro,
      idPerfil: usuario.idPerfil,
    };
  }

  cancelarEdicionUsuario(): void {
    this.usuarioEditandoUsername = null;
    this.usuarioForm = this.nuevoUsuarioForm();
  }

  borrarUsuario(username: string): void {
    if (!confirm(`¿Borrar el usuario ${username}?`)) {
      return;
    }

    this.adminService.borrarUsuario(username).subscribe({
      next: () => {
        this.feedback.set('Usuario borrado.');
        this.cancelarEdicionUsuario();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido borrar el usuario.'),
    });
  }

  guardarTipo(): void {
    const request =
      this.tipoEditandoId === null
        ? this.adminService.crearTipo(this.tipoForm)
        : this.adminService.actualizarTipo(this.tipoEditandoId, this.tipoForm);

    request.subscribe({
      next: () => {
        this.feedback.set(this.tipoEditandoId === null ? 'Tipo creado correctamente.' : 'Tipo actualizado.');
        this.cancelarEdicionTipo();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido guardar el tipo.'),
    });
  }

  editarTipo(tipo: TipoEvento): void {
    this.tipoEditandoId = tipo.idTipo;
    this.tipoForm = {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
    };
  }

  cancelarEdicionTipo(): void {
    this.tipoEditandoId = null;
    this.tipoForm = this.nuevoTipoForm();
  }

  borrarTipo(idTipo: number): void {
    if (!confirm('¿Borrar este tipo de evento?')) {
      return;
    }

    this.adminService.borrarTipo(idTipo).subscribe({
      next: () => {
        this.feedback.set('Tipo borrado.');
        this.cancelarEdicionTipo();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido borrar el tipo.'),
    });
  }

  guardarPerfil(): void {
    const request =
      this.perfilEditandoId === null
        ? this.adminService.crearPerfil(this.perfilForm)
        : this.adminService.actualizarPerfil(this.perfilEditandoId, this.perfilForm);

    request.subscribe({
      next: () => {
        this.feedback.set(
          this.perfilEditandoId === null ? 'Perfil creado correctamente.' : 'Perfil actualizado.',
        );
        this.cancelarEdicionPerfil();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido guardar el perfil.'),
    });
  }

  editarPerfil(perfil: Perfil): void {
    this.perfilEditandoId = perfil.idPerfil;
    this.perfilForm = {
      nombre: perfil.nombre,
    };
  }

  cancelarEdicionPerfil(): void {
    this.perfilEditandoId = null;
    this.perfilForm = this.nuevoPerfilForm();
  }

  borrarPerfil(idPerfil: number): void {
    if (!confirm('¿Borrar este perfil?')) {
      return;
    }

    this.adminService.borrarPerfil(idPerfil).subscribe({
      next: () => {
        this.feedback.set('Perfil borrado.');
        this.cancelarEdicionPerfil();
        this.reloadAll();
      },
      error: (err) => this.mostrarError(err, 'No se ha podido borrar el perfil.'),
    });
  }

  private reloadAll(): void {
    this.adminService.getEventos().subscribe((data) => this.eventos.set(data));
    this.adminService.getUsuarios().subscribe((data) => this.usuarios.set(data));
    this.adminService.getTipos().subscribe((data) => {
      this.tipos.set(data);
      if (!this.eventoForm.idTipo && data.length) {
        this.eventoForm.idTipo = data[0].idTipo;
      }
    });
    this.adminService.getPerfiles().subscribe((data) => {
      this.perfiles.set(data);
      if (!this.usuarioForm.idPerfil && data.length) {
        this.usuarioForm.idPerfil = data[0].idPerfil;
      }
    });
  }

  private nuevoEventoForm(): EventoPayload {
    return {
      nombre: '',
      descripcion: '',
      fechaInicio: '',
      duracion: 90,
      direccion: '',
      estado: 'ACTIVO',
      aforoMaximo: 50,
      minimoAsistencia: 10,
      precio: 20,
      idTipo: this.tipos()[0]?.idTipo ?? 0,
    };
  }

  private nuevoUsuarioForm(): UsuarioPayload {
    return {
      username: '',
      password: '',
      email: '',
      nombre: '',
      apellidos: '',
      direccion: '',
      enabled: 1,
      fechaRegistro: this.hoy(),
      idPerfil: this.perfiles()[0]?.idPerfil ?? 0,
    };
  }

  private nuevoTipoForm(): TipoEventoPayload {
    return {
      nombre: '',
      descripcion: '',
    };
  }

  private nuevoPerfilForm(): PerfilPayload {
    return {
      nombre: '',
    };
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private mostrarError(err: unknown, fallback: string): void {
    const error = err as { error?: string | { message?: string; error?: string } };
    const message =
      typeof error.error === 'string' ? error.error : (error.error?.message ?? error.error?.error);
    this.feedback.set(message ?? fallback);
  }
}
