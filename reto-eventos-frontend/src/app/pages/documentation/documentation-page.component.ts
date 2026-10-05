import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FitLineDirective } from '../../shared/fit-line/fit-line.directive';

/**
 * Documentación para asistentes («Consultar documentación» en Localizaciones): qué llevar, qué
 * documentos se admiten y qué soportes vitales se permiten en las sedes. Es el final de la cadena
 * de páginas secundarias: no enlaza a ninguna otra, solo la ruta de navegación vuelve al inicio.
 */
@Component({
  selector: 'app-documentation-page',
  standalone: true,
  imports: [FitLineDirective, RouterLink],
  templateUrl: './documentation-page.component.html',
  styleUrls: ['../../shared/secondary-page/secondary-page.css', './documentation-page.component.css'],
})
export class DocumentationPageComponent {
  readonly carry = [
    { title: 'Código de acceso', note: 'El de su reserva, impreso o en pantalla' },
    { title: 'Documento identificativo', note: 'En vigor, original o copia digital' },
    { title: 'Soporte vital', note: 'Solo si lo necesita y figura en el catálogo' },
  ];

  readonly facts = [
    { label: 'Taquilla de acreditación', value: 'Abre 45 minutos antes de la sesión' },
    { label: 'Control de ingreso', value: 'Cierra 10 minutos antes' },
    { label: 'Edad mínima', value: '18 años, salvo indicación expresa' },
    { label: 'Código de acceso', value: 'Personal e intransferible' },
  ];

  readonly documents = [
    {
      code: '01',
      title: 'Residentes en SOL-III',
      text: 'DNI, pasaporte o permiso de residencia en vigor. Se admite también su versión digital oficial.',
      detail: 'Original o copia digital',
    },
    {
      code: '02',
      title: 'Visitantes de otros sistemas',
      text: 'Salvoconducto expedido en su punto de origen, con traducción jurada al castellano, al gallego o al inglés.',
      detail: 'Traducción jurada',
    },
    {
      code: '03',
      title: 'Organismos colectivos',
      text: 'Colonias, enjambres y demás organismos compuestos acreditan a un portavoz, que responde por el conjunto durante toda la sesión.',
      detail: 'Un documento por portavoz',
    },
    {
      code: '04',
      title: 'Acompañantes',
      text: 'Cada acompañante necesita su propia reserva y su propio documento, también si comparte organismo con el titular.',
      detail: 'Reserva individual',
    },
  ];

  readonly catalog = [
    {
      title: 'Admitidos',
      items: [
        'Respiradores y mascarillas de circuito cerrado',
        'Trajes presurizados flexibles, sin casco rígido en sala',
        'Recipientes de hidratación sellados, de hasta un litro',
        'Exoesqueletos de soporte, en modo silencioso',
      ],
    },
    {
      title: 'Con autorización previa',
      items: [
        'Atmósferas portátiles distintas del nitrógeno y el oxígeno',
        'Fuentes propias de calor o de frío',
        'Tanques de inmersión de hasta 200 litros',
        'Acompañamiento sanitario de su procedencia',
      ],
      note: 'Solicítela al reservar, en el campo de observaciones.',
    },
    {
      title: 'No admitidos',
      items: [
        'Combustibles, comburentes y atmósferas inflamables',
        'Equipos que emitan luz o sonido durante la sesión',
        'Recipientes abiertos o sin etiquetar',
        'Soportes vitales que estén, a su vez, vivos',
      ],
    },
  ];
}
