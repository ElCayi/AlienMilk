import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { RequestService } from '../../core/services/request.service';
import {
  ApiError,
  CampoFormulario,
  FormularioDefinicion,
  SolicitudRecibida,
} from '../../models/api.models';
import { FitLineDirective } from '../fit-line/fit-line.directive';

type State = 'loading' | 'unavailable' | 'ready' | 'sending' | 'sent';

/**
 * Molde de los formularios públicos: pinta los campos que dicta la definición del backend, los
 * valida igual que él, envía la solicitud y muestra el resguardo. Un formulario nuevo no necesita
 * código, solo su JSON en el backend y un `<app-request-form formKey="…">` donde se quiera.
 */
@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [FitLineDirective, ReactiveFormsModule, RouterLink],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.css',
})
export class RequestFormComponent implements OnInit {
  private readonly requests = inject(RequestService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Clave del formulario en el backend (resources/formularios/<clave>.json). */
  readonly formKey = input.required<string>();
  /** Id del título, para que un diálogo pueda nombrarse con él. */
  readonly headingId = input('request-form-title');
  readonly sent = output<SolicitudRecibida>();

  readonly state = signal<State>('loading');
  readonly definition = signal<FormularioDefinicion | null>(null);
  readonly receipt = signal<SolicitudRecibida | null>(null);
  readonly formError = signal('');
  /** Tras el primer intento de envío se señalan todos los campos, también los no tocados. */
  readonly attempted = signal(false);

  readonly today = isoDate(new Date());
  form = this.buildForm([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.requests
      .definition(this.formKey())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definition) => {
          this.definition.set(definition);
          this.form = this.buildForm(definition.campos);
          this.state.set('ready');
        },
        error: () => this.state.set('unavailable'),
      });
  }

  /** Vuelve al formulario vacío, por ejemplo al cerrar el diálogo tras un envío. */
  reset(): void {
    const definition = this.definition();
    if (!definition) {
      return;
    }
    this.form = this.buildForm(definition.campos);
    this.receipt.set(null);
    this.formError.set('');
    this.attempted.set(false);
    this.state.set('ready');
  }

  submit(): void {
    const definition = this.definition();
    if (!definition || this.state() === 'sending') {
      return;
    }

    this.attempted.set(true);
    this.formError.set('');
    if (this.form.invalid) {
      this.focusFirstError();
      return;
    }

    this.state.set('sending');
    this.requests
      .send(definition.clave, {
        valores: this.values(definition.campos),
        aceptaPrivacidad: this.form.controls.aceptaPrivacidad.value,
        web: this.form.controls.web.value,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (receipt) => {
          this.receipt.set(receipt);
          this.state.set('sent');
          this.sent.emit(receipt);
          setTimeout(() =>
            this.host.nativeElement.querySelector<HTMLElement>('.request-receipt')?.focus(),
          );
        },
        error: (error: HttpErrorResponse) => {
          this.state.set('ready');
          this.showServerErrors(error);
        },
      });
  }

  fieldId(field: CampoFormulario): string {
    return `${this.formKey()}-${field.clave}`;
  }

  control(field: CampoFormulario): AbstractControl {
    return this.form.controls.valores.controls[field.clave];
  }

  showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.attempted());
  }

  errorText(field: CampoFormulario): string {
    const errors = this.control(field).errors ?? {};
    if (errors['server']) {
      return errors['server'];
    }
    if (errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (errors['email']) {
      return 'Escriba un correo válido';
    }
    if (errors['maxlength']) {
      return `Admite como máximo ${errors['maxlength'].requiredLength} caracteres`;
    }
    if (errors['min']) {
      return `El mínimo es ${errors['min'].min}`;
    }
    if (errors['max']) {
      return `El máximo es ${errors['max'].max}`;
    }
    if (errors['integer']) {
      return 'Escriba un número entero';
    }
    if (errors['past']) {
      return 'La fecha no puede haber pasado';
    }
    return 'Revise este campo';
  }

  inputType(field: CampoFormulario): string {
    return { email: 'email', numero: 'number', fecha: 'date' }[field.tipo as string] ?? 'text';
  }

  private buildForm(fields: CampoFormulario[]) {
    const controls: Record<string, FormControl<string | number | null>> = {};
    for (const field of fields) {
      controls[field.clave] = new FormControl<string | number | null>(
        '',
        fieldValidators(field, this.today),
      );
    }
    return new FormGroup({
      valores: new FormGroup(controls),
      aceptaPrivacidad: new FormControl(false, {
        nonNullable: true,
        validators: Validators.requiredTrue,
      }),
      web: new FormControl('', { nonNullable: true }),
    });
  }

  /** Solo los campos con valor: textos sin espacios sobrantes y números como números. */
  private values(fields: CampoFormulario[]): Record<string, string | number> {
    const values: Record<string, string | number> = {};
    for (const field of fields) {
      const raw = this.control(field).value;
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (value !== '' && value !== null && value !== undefined) {
        values[field.clave] = value;
      }
    }
    return values;
  }

  /** El backend valida con la misma definición: si aun así rechaza algo, se señala en su campo. */
  private showServerErrors(error: HttpErrorResponse): void {
    const body = (error.error ?? {}) as ApiError;
    const fieldErrors = body.errores ?? {};
    let marked = false;
    for (const [key, message] of Object.entries(fieldErrors)) {
      const control =
        key === 'aceptaPrivacidad'
          ? this.form.controls.aceptaPrivacidad
          : this.form.controls.valores.controls[key];
      if (control) {
        control.setErrors({ ...(control.errors ?? {}), server: message });
        control.markAsTouched();
        marked = true;
      }
    }

    if (error.status === 429 && body.message) {
      this.formError.set(body.message);
    } else if (marked) {
      this.focusFirstError();
    } else if (error.status === 0) {
      this.formError.set('No hemos podido conectar. Compruebe su conexión e inténtelo de nuevo.');
    } else {
      this.formError.set(
        body.message ?? 'No hemos podido enviar la solicitud. Inténtelo de nuevo.',
      );
    }
  }

  private focusFirstError(): void {
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }
}

function fieldValidators(field: CampoFormulario, today: string): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (field.requerido) {
    validators.push(Validators.required);
  }
  switch (field.tipo) {
    case 'texto':
    case 'texto-largo':
    case 'email':
      validators.push(
        Validators.maxLength(field.maximo ?? (field.tipo === 'texto-largo' ? 1000 : 120)),
      );
      if (field.tipo === 'email') {
        validators.push(Validators.email);
      }
      break;
    case 'numero':
      validators.push(integer);
      if (field.minimo !== undefined) {
        validators.push(Validators.min(field.minimo));
      }
      if (field.maximo !== undefined) {
        validators.push(Validators.max(field.maximo));
      }
      break;
    case 'fecha':
      if (field.desdeHoy) {
        validators.push((control) =>
          control.value && control.value < today ? { past: true } : null,
        );
      }
      break;
  }
  return validators;
}

function integer(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return value === '' || value === null || Number.isInteger(Number(value))
    ? null
    : { integer: true };
}

function isoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
