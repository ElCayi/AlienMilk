import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

/**
 * Aviso legal, privacidad y cookies. Los textos están pendientes de redactar; mientras tanto la
 * página dice qué es el proyecto y quién responde de él, que es lo único ya decidido.
 */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.css',
})
export class LegalPageComponent {
  readonly title = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['title'] as string)),
    { initialValue: '' },
  );
}
