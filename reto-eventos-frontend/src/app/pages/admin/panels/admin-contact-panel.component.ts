import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ContactService } from '../../../core/services/contact.service';
import {
  DIAS,
  describeSchedule,
  formatHour,
  siteStatus,
} from '../../../features/contact/opening-hours';
import { Contacto, ContactoPayload } from '../../../models/api.models';

/** Formulario de la ficha de contacto: edita la única fila de la sede y enseña cómo quedará. */
@Component({
  selector: 'app-admin-contact-panel',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-contact-panel.component.html',
  styles: `
    .contact-form {
      grid-column: span 8;
    }

    .contact-preview {
      grid-column: span 4;
      align-self: start;
    }

    .field-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
    }

    .day-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .day-picker label {
      cursor: pointer;
    }

    .day-picker input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .day-picker span {
      display: inline-block;
      min-width: 3.1rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid rgba(241, 236, 239, 0.14);
      border-radius: 999px;
      color: #b9afb6;
      font-weight: 700;
      text-align: center;
    }

    .day-picker input:checked + span {
      border-color: #ff7f7f;
      color: white;
      background: rgba(255, 127, 127, 0.22);
    }

    .day-picker input:focus-visible + span {
      outline: 2px solid rgba(255, 127, 127, 0.5);
      outline-offset: 2px;
    }

    .field-hint {
      color: #91878e;
      font-size: 0.78rem;
      padding-left: 0.25rem;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .form-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .contact-preview dl {
      display: grid;
      gap: 0.8rem;
      margin: 0;
    }

    .contact-preview dt {
      color: #91878e;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .contact-preview dd {
      margin: 0.2rem 0 0;
      color: #f1ecef;
      overflow-wrap: anywhere;
    }

    .panel-feedback {
      margin: 0;
      color: #b9afb6;
    }

    .panel-feedback.is-error {
      color: #fca5a5;
    }

    @media (max-width: 1100px) {
      .contact-form,
      .contact-preview {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 600px) {
      .field-row {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminContactPanelComponent {
  private readonly contactService = inject(ContactService);

  readonly days = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({
    dia,
    corto: DIAS[dia].slice(0, 3),
    nombre: DIAS[dia],
  }));
  readonly timeZones = supportedTimeZones();

  readonly saved = this.contactService.contacto;
  readonly loadError = this.contactService.error;
  readonly form = signal<ContactoPayload | null>(null);
  readonly saving = signal(false);
  readonly feedback = signal<{ text: string; error: boolean } | null>(null);

  readonly schedulePreview = computed(() => {
    const form = this.form();
    return form && form.diasApertura.length ? describeSchedule(form) : 'Sin días de apertura';
  });

  readonly statusPreview = computed(() => {
    const form = this.form();
    return form && form.diasApertura.length && form.horaApertura && form.horaCierre
      ? siteStatus(form, new Date())
      : null;
  });

  readonly dirty = computed(() => {
    const form = this.form();
    const saved = this.saved();
    return !!form && !!saved && JSON.stringify(form) !== JSON.stringify(toPayload(saved));
  });

  constructor() {
    this.contactService.load(true);

    // Rellena el formulario cuando llega la ficha, sin pisar lo que se esté escribiendo.
    effect(() => {
      const saved = this.saved();
      if (saved && !this.form()) {
        this.form.set(toPayload(saved));
      }
    });
  }

  update<K extends keyof ContactoPayload>(campo: K, valor: ContactoPayload[K]): void {
    this.form.update((form) => (form ? { ...form, [campo]: valor } : form));
    this.feedback.set(null);
  }

  toggleDay(dia: number, marcado: boolean): void {
    const dias = this.form()?.diasApertura ?? [];
    const siguientes = marcado ? [...dias, dia] : dias.filter((d) => d !== dia);
    this.update(
      'diasApertura',
      [...new Set(siguientes)].sort((a, b) => a - b),
    );
  }

  discard(): void {
    const saved = this.saved();
    if (saved) {
      this.form.set(toPayload(saved));
    }
    this.feedback.set(null);
  }

  save(): void {
    const form = this.form();
    if (!form) {
      return;
    }
    if (!form.diasApertura.length) {
      this.feedback.set({ text: 'Selecciona al menos un día de apertura.', error: true });
      return;
    }

    this.saving.set(true);
    this.contactService.update(form).subscribe({
      next: (contacto) => {
        this.form.set(toPayload(contacto));
        this.feedback.set({ text: 'Ficha de contacto actualizada.', error: false });
        this.saving.set(false);
      },
      error: (err) => {
        const message = (err as { error?: { message?: string } }).error?.message;
        this.feedback.set({ text: message ?? 'No se ha podido guardar la ficha.', error: true });
        this.saving.set(false);
      },
    });
  }

  retry(): void {
    this.contactService.load(true);
  }
}

function toPayload(contacto: Contacto): ContactoPayload {
  return {
    nombreSede: contacto.nombreSede,
    direccion: contacto.direccion,
    ciudad: contacto.ciudad,
    email: contacto.email,
    telefono: contacto.telefono ?? '',
    diasApertura: [...contacto.diasApertura],
    horaApertura: formatHour(contacto.horaApertura),
    horaCierre: formatHour(contacto.horaCierre),
    zonaHoraria: contacto.zonaHoraria,
    comoLlegar: contacto.comoLlegar ?? '',
    condicionesAcceso: contacto.condicionesAcceso ?? '',
  };
}

function supportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  return intl.supportedValuesOf?.('timeZone') ?? ['Europe/Madrid'];
}
