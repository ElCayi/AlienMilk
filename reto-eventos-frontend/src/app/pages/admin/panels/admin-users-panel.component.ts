import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Perfil, Usuario, UsuarioPayload } from '../../../models/api.models';

@Component({
  selector: 'app-admin-users-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPanelComponent {
  @Input({ required: true }) usuarios: Usuario[] = [];
  @Input({ required: true }) perfiles: Perfil[] = [];
  @Input({ required: true }) form!: UsuarioPayload;
  @Input() editingUsername: string | null = null;
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly edit = new EventEmitter<Usuario>();
  @Output() readonly removeRequested = new EventEmitter<string>();
  @Output() readonly cancelRequested = new EventEmitter<void>();
}
