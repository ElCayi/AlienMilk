import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Perfil, PerfilPayload } from '../../../models/api.models';

@Component({
  selector: 'app-admin-profiles-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profiles-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProfilesPanelComponent {
  @Input({ required: true }) perfiles: Perfil[] = [];
  @Input({ required: true }) form!: PerfilPayload;
  @Input() editingId: number | null = null;
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly edit = new EventEmitter<Perfil>();
  @Output() readonly removeRequested = new EventEmitter<number>();
  @Output() readonly cancelRequested = new EventEmitter<void>();
}
