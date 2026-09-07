import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TipoEvento, TipoEventoPayload } from '../../../models/api.models';

@Component({
  selector: 'app-admin-types-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-types-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTypesPanelComponent {
  @Input({ required: true }) tipos: TipoEvento[] = [];
  @Input({ required: true }) form!: TipoEventoPayload;
  @Input() editingId: number | null = null;
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly edit = new EventEmitter<TipoEvento>();
  @Output() readonly removeRequested = new EventEmitter<number>();
  @Output() readonly cancelRequested = new EventEmitter<void>();
}
