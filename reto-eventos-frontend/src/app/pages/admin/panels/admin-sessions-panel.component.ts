import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EventoListado, EventoPayload, TipoEvento } from '../../../models/api.models';

@Component({
  selector: 'app-admin-sessions-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './admin-sessions-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSessionsPanelComponent {
  @Input({ required: true }) eventos: EventoListado[] = [];
  @Input({ required: true }) tipos: TipoEvento[] = [];
  @Input({ required: true }) form!: EventoPayload;
  @Input() editingId: number | null = null;
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly edit = new EventEmitter<number>();
  @Output() readonly removeRequested = new EventEmitter<number>();
  @Output() readonly cancelRequested = new EventEmitter<void>();
}
