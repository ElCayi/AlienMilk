import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SpecimenCultureComponent } from '../../features/about/specimen-culture.component';

/** Nosotros, vestida con el lenguaje visual del resto del sitio. */
@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, SpecimenCultureComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css',
})
export class AboutPageComponent {}
