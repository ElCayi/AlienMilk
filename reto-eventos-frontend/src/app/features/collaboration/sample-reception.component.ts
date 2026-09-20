import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-sample-reception',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sample-reception.component.html',
  styleUrl: './sample-reception.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleReceptionComponent {
  @Input() panelOnly = false;
  @Input() hideActions = false;
}
