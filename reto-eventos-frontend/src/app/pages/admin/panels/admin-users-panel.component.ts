import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { KeepHeightDirective } from '../../../shared/keep-height/keep-height.directive';

import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { Perfil, Usuario, UsuarioPayload } from '../../../models/api.models';
import { PanelConfirmService } from '../../../shared/panel/panel-confirm';
import { PanelDialogComponent } from '../../../shared/panel/panel-dialog.component';
import {
  errorMessage,
  fieldErrors,
  formatDay,
  matches,
  profileLabel,
} from '../../../shared/panel/panel-format';

type Filter = 'TODOS' | 'CLIENTES' | 'ADMINS' | 'DESACTIVADOS';

/**
 * Cuentas de la web. La contraseña es obligatoria al dar de alta y, al editar, se deja vacía para
 * conservarla; la fecha de alta la pone el servidor. La propia cuenta no se puede borrar, desactivar
 * ni dejar sin perfil de administrador. Los pedidos en curso impiden borrar una cuenta; los cerrados se
 * conservan sin ella.
 */
@Component({
  selector: 'app-admin-users-panel',
  standalone: true,
  imports: [FormsModule, RouterLink, PanelDialogComponent, KeepHeightDirective],
  templateUrl: './admin-users-panel.component.html',
  styleUrl: '../../../shared/panel/panel.css',
})
export class AdminUsersPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(PanelConfirmService);

  readonly users = signal<Usuario[]>([]);
  readonly profiles = signal<Perfil[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly notice = signal<{ text: string; error: boolean } | null>(null);
  readonly busy = signal<string | null>(null);

  readonly query = signal('');
  readonly filter = signal<Filter>('TODOS');

  readonly me = computed(() => this.auth.currentUser()?.username ?? '');

  readonly filters = computed(() => {
    const list = this.users();
    return [
      { value: 'TODOS' as Filter, label: 'Todas', count: list.length },
      { value: 'CLIENTES' as Filter, label: 'Clientes', count: list.filter(isClient).length },
      { value: 'ADMINS' as Filter, label: 'Administración', count: list.filter(isAdmin).length },
      { value: 'DESACTIVADOS' as Filter, label: 'Desactivadas', count: list.filter((u) => !u.enabled).length },
    ];
  });

  readonly visible = computed(() => {
    const filter = this.filter();
    const query = this.query();
    return this.users().filter(
      (user) =>
        (filter === 'TODOS' ||
          (filter === 'CLIENTES' && isClient(user)) ||
          (filter === 'ADMINS' && isAdmin(user)) ||
          (filter === 'DESACTIVADOS' && !user.enabled)) &&
        matches(query, user.username, user.nombre, user.apellidos, user.email),
    );
  });

  // Formulario de alta y edición, en el diálogo.
  readonly dialog = viewChild.required(PanelDialogComponent);
  readonly editing = signal<Usuario | null>(null);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly formError = signal<string | null>(null);
  form: UsuarioPayload = emptyForm();
  /** Activa o no, como casilla; se envía como 1 o 0. */
  active = true;

  readonly day = formatDay;
  readonly profile = profileLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({ users: this.admin.getUsuarios(), profiles: this.admin.getPerfiles() }).subscribe({
      next: ({ users, profiles }) => {
        this.users.set([...users].sort(byName));
        this.profiles.set(profiles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  fullName(user: Usuario): string {
    return [user.nombre, user.apellidos].filter(Boolean).join(' ');
  }

  isMe(user: Usuario | null): boolean {
    return !!user && user.username === this.me();
  }

  openNew(): void {
    this.editing.set(null);
    const client = this.profiles().find((profile) => profile.nombre === 'ROLE_CLIENTE');
    this.form = emptyForm(client?.idPerfil ?? null);
    this.active = true;
    this.resetErrors();
    this.dialog().open();
  }

  openEdit(user: Usuario): void {
    this.editing.set(user);
    this.form = {
      username: user.username,
      password: '',
      email: user.email,
      nombre: user.nombre,
      apellidos: user.apellidos ?? '',
      direccion: user.direccion ?? '',
      enabled: user.enabled,
      idPerfil: user.idPerfil,
    };
    this.active = !!user.enabled;
    this.resetErrors();
    this.dialog().open();
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    const editing = this.editing();
    const payload: UsuarioPayload = { ...this.form, enabled: this.active ? 1 : 0 };
    this.saving.set(true);
    this.resetErrors();
    const request = editing
      ? this.admin.actualizarUsuario(editing.username, payload)
      : this.admin.crearUsuario(payload);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.users.update((list) =>
          (editing
            ? list.map((item) => (item.username === saved.username ? saved : item))
            : [...list, saved]
          ).sort(byName),
        );
        this.dialog().close();
        this.notice.set({
          text: editing ? `Cuenta de ${this.fullName(saved)} actualizada.` : `Cuenta ${saved.username} creada.`,
          error: false,
        });
      },
      error: (error) => {
        this.saving.set(false);
        const errors = fieldErrors(error);
        this.errors.set(errors);
        this.formError.set(
          Object.keys(errors).length
            ? 'Revisa los campos marcados.'
            : errorMessage(error, 'No se ha podido guardar la cuenta.'),
        );
      },
    });
  }

  async remove(user: Usuario): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Borrar la cuenta?',
      message: `Se borran la cuenta ${user.username} y sus reservas. Sus pedidos cerrados se conservan como registro de la venta; si tiene alguno en curso, no se podrá borrar hasta que termine.`,
      confirm: 'Borrar cuenta',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(user.username);
    this.admin.borrarUsuario(user.username).subscribe({
      next: () => {
        this.busy.set(null);
        this.users.update((list) => list.filter((item) => item.username !== user.username));
        this.notice.set({ text: `Cuenta ${user.username} borrada.`, error: false });
      },
      error: (error) => {
        this.busy.set(null);
        this.notice.set({ text: errorMessage(error, 'No se ha podido borrar la cuenta.'), error: true });
      },
    });
  }

  error(field: string): string | null {
    return this.errors()[field] ?? null;
  }

  private resetErrors(): void {
    this.errors.set({});
    this.formError.set(null);
  }
}

function isAdmin(user: Usuario): boolean {
  return user.perfil === 'ROLE_ADMON';
}

function isClient(user: Usuario): boolean {
  return user.perfil === 'ROLE_CLIENTE';
}

function byName(a: Usuario, b: Usuario): number {
  return a.nombre.localeCompare(b.nombre, 'es') || a.username.localeCompare(b.username, 'es');
}

function emptyForm(idPerfil: number | null = null): UsuarioPayload {
  return {
    username: '',
    password: '',
    email: '',
    nombre: '',
    apellidos: '',
    direccion: '',
    enabled: 1,
    idPerfil,
  };
}
