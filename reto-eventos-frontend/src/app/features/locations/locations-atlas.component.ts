import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { EventoDetalle } from '../../models/api.models';
import { SampleReceptionComponent } from '../collaboration/sample-reception.component';

@Component({
  selector: 'app-locations-atlas',
  standalone: true,
  imports: [CommonModule, SampleReceptionComponent],
  templateUrl: './locations-atlas.component.html',
  styleUrl: './locations-atlas.component.css',
  host: { '[class.locations-collaboration-section]': 'collaborationMode' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsAtlasComponent {
  @Input() locations: EventoDetalle[] = [];
  @Input() loading = false;
  @Input() collaborationMode = false;

  trackLocation(_index: number, location: EventoDetalle): number {
    return location.idEvento;
  }
}
