import { Component, computed, input, model } from '@angular/core';

import { DossierKind, ROW_PARTS } from './dossier-fields';

/** Rótulo y forma de cada dato de una fila. */
const PART_INFO: Record<string, { label: string; area?: boolean; className?: string }> = {
  etiqueta: { label: 'Etiqueta' },
  valor: { label: 'Valor' },
  hora: { label: 'Hora', className: 'is-short' },
  titulo: { label: 'Título' },
  detalle: { label: 'Detalle (opcional)', area: true, className: 'is-full' },
  pregunta: { label: 'Pregunta', className: 'is-full' },
  respuesta: { label: 'Respuesta', area: true, className: 'is-full' },
  rol: { label: 'Papel' },
  nombre: { label: 'Nombre' },
};

/**
 * Los campos de una fila del expediente (un párrafo, una línea, etiqueta y valor, un paso del
 * programa, una pregunta, un colaborador). Sin caja propia (\`display: contents\`): sus campos se
 * colocan en la rejilla de la fila que lo contiene.
 */
@Component({
  selector: 'app-dossier-row-editor',
  standalone: true,
  template: `
    @switch (kind()) {
      @case ('paragraphs') {
        <textarea rows="3" [attr.aria-label]="label()" [value]="text()" (input)="setText($event)"></textarea>
      }
      @case ('lines') {
        <input [attr.aria-label]="label()" [value]="text()" (input)="setText($event)" />
      }
      @default {
        @for (part of parts(); track part.key) {
          @if (part.area) {
            <textarea
              rows="2"
              [class]="part.className ?? ''"
              [placeholder]="part.label"
              [attr.aria-label]="part.label + ' · ' + label()"
              [value]="record()[part.key] ?? ''"
              (input)="setPart(part.key, $event)"
            ></textarea>
          } @else {
            <input
              [class]="part.className ?? ''"
              [placeholder]="part.label"
              [attr.aria-label]="part.label + ' · ' + label()"
              [value]="record()[part.key] ?? ''"
              (input)="setPart(part.key, $event)"
            />
          }
        }
      }
    }
  `,
  styleUrl: './dossier-row-editor.component.css',
})
export class DossierRowEditorComponent {
  readonly kind = input.required<DossierKind>();
  readonly value = model<unknown>();
  /** Para los lectores de pantalla: «Pregunta 2», «Párrafo 1»… */
  readonly label = input('');

  readonly text = computed(() => (typeof this.value() === 'string' ? (this.value() as string) : ''));
  readonly record = computed(() => (this.value() ?? {}) as Record<string, string | undefined>);
  readonly parts = computed(() =>
    ROW_PARTS[this.kind()].map((key) => ({ key, ...PART_INFO[key] })),
  );

  setText(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  setPart(key: string, event: Event): void {
    this.value.set({ ...this.record(), [key]: (event.target as HTMLInputElement).value });
  }
}
