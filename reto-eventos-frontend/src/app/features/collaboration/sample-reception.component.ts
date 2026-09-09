import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sample-reception',
  standalone: true,
  templateUrl: './sample-reception.component.html',
  styleUrl: './sample-reception.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleReceptionComponent {}
