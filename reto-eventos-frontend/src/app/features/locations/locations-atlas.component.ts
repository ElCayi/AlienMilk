import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { EventoDetalle } from '../../models/api.models';

@Component({
  selector: 'app-locations-atlas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locations-atlas.component.html',
  styleUrl: './locations-atlas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsAtlasComponent {
  @Input() locations: EventoDetalle[] = [];
  @Input() loading = false;

  trackLocation(_index: number, location: EventoDetalle): number {
    return location.idEvento;
  }
}
