/**
 * Operadores asociados: empresas independientes que prestan un servicio en torno a las sesiones
 * (llegar, dejar el equipaje, acompañar a una delegación). Cada uno tiene una ficha corta en
 * /operadores/<slug>; el recuadro de Localizaciones enlaza a ellas.
 */
export interface Operator {
  slug: string;
  name: string;
  /** Lo que gestiona, con el mismo rótulo que en el recuadro de Localizaciones. */
  area: string;
  tagline: string;
  intro: string;
  /**
   * Web oficial inventada. El dominio .sol3 no puede existir (un dominio de primer nivel no lleva
   * cifras), así que el enlace queda roto a propósito y nunca lleva a una empresa real.
   */
  website: string;
  /** Dato administrativo bajo el sello: concesión, registro o acreditación, y su número. */
  registry: { label: string; code: string };
  service: {
    kicker: string;
    /** Una entrada por línea, como los <br> de los títulos de Contacto. */
    title: string[];
    copy: string;
    items: { code: string; title: string; text: string; detail?: string }[];
    facts: { label: string; value: string }[];
    action: string;
    subject: string;
  };
  conditions: {
    kicker: string;
    title: string;
    items: { title: string; text: string }[];
  };
  /** Letra pequeña propia del operador; cierra el aviso de independencia. */
  note: string;
}

export const OPERATORS: Operator[] = [
  {
    slug: 'am-transit',
    name: 'AM Transit',
    area: 'Transporte',
    tagline: 'Le llevamos. Y le devolvemos.',
    intro:
      'AM Transit opera los traslados entre los intercambiadores de la red y las instalaciones donde se celebran las sesiones de AlienMilk. Conecta la sede de A Coruña con el resto de la ciudad y, en temporada de cosecha, la órbita de Nair con el Muelle de Isca. Sus vehículos admiten pasajeros de cualquier procedencia.',
    website: 'www.amtransit.sol3',
    registry: { label: 'Concesión de transporte', code: 'AMT-0447' },
    service: {
      kicker: 'Líneas y horarios',
      title: ['Del intercambiador', 'a la sala.'],
      copy: 'Cuatro servicios regulares enlazan los intercambiadores con las sedes de la red. Su reserva indica la parada que le corresponde.',
      items: [
        {
          code: 'A1',
          title: 'Bus urbano de A Coruña',
          text: 'Estación intermodal – Cúpula Atlántica. Para frente al Hangar 7, en la Rúa dos Vixías.',
          detail: 'Cada 20 minutos · De 7:00 a 23:30',
        },
        {
          code: 'N',
          title: 'Servicio nocturno',
          text: 'Sale del Hangar 7 al terminar las sesiones de noche y recorre los intercambiadores de la ciudad.',
          detail: 'Última salida a las 00:40',
        },
        {
          code: 'L4',
          title: 'Lanzadera de Isca',
          text: 'Enlaza la órbita de Nair con el Muelle de Isca, dársena 4. Solo opera en temporada de cosecha.',
          detail: 'Según el calendario de cosecha',
        },
        {
          code: 'R',
          title: 'Regreso',
          text: 'Al término de cada sesión, traslado al lugar exacto en el que se le recogió.',
          detail: 'Regreso garantizado al punto de partida',
        },
      ],
      facts: [
        { label: 'Billete', value: 'El código de acceso de su reserva' },
        { label: 'Atención al viajero', value: 'En las taquillas y a bordo' },
        { label: 'Accesibilidad', value: 'Rampa, anclajes y asientos de varios tamaños' },
        { label: 'Objetos perdidos', value: 'Se conservan quince días en taquilla' },
      ],
      action: 'Consultar un traslado',
      subject: 'AM Transit · Consulta de traslado',
    },
    conditions: {
      kicker: 'Condiciones de transporte',
      title: 'Antes de subir.',
      items: [
        {
          title: 'Con margen',
          text: 'Las salidas se rigen por la hora local de cada parada. Elija un servicio que llegue antes de que abra la acreditación, 45 minutos antes de su sesión.',
        },
        {
          title: 'Equipaje',
          text: 'Un bulto de mano por pasajero. Las maletas, los envases y todo lo que no quepa en su regazo viajan con Helix Transfer.',
        },
        {
          title: 'Durante el trayecto',
          text: 'Permanezca sentado y con el cinturón abrochado hasta su parada, también si el vehículo deja de tocar el suelo.',
        },
      ],
    },
    note: 'AM Transit es una empresa independiente. La coincidencia de iniciales es anterior al acuerdo.',
  },
  {
    slug: 'helix-transfer',
    name: 'Helix Transfer',
    area: 'Equipaje',
    tagline: 'Lo que no entra en sala, a buen recaudo.',
    intro:
      'Helix Transfer gestiona la consigna de las sedes de AlienMilk y el traslado de equipajes entre estaciones. Durante la sesión custodia los efectos personales de cada asistente y, a la salida, entrega las preparaciones adquiridas en envases homologados para el viaje.',
    website: 'www.helixtransfer.sol3',
    registry: { label: 'Registro de custodia', code: 'HX-1203' },
    service: {
      kicker: 'Consigna y envases',
      title: ['Usted, a la sesión.', 'Lo demás, con nosotros.'],
      copy: 'Tres servicios y un solo mostrador, junto a la taquilla de acreditación de cada sede.',
      items: [
        {
          code: '01',
          title: 'Consigna durante la sesión',
          text: 'Deje sus pertenencias en el mostrador al acreditarse. Recibirá un resguardo numerado y las recogerá a la salida, en el mismo punto.',
          detail: 'Abre 45 minutos antes de cada sesión',
        },
        {
          code: '02',
          title: 'Envases para llevar',
          text: 'Las preparaciones adquiridas se entregan selladas, etiquetadas y con su ficha de conservación. No las exponga a la luz directa: algunas siguen madurando durante el viaje.',
          detail: 'Envases homologados',
        },
        {
          code: '03',
          title: 'Traslado entre estaciones',
          text: 'Si su viaje continúa hacia otra sede de la red, su equipaje puede adelantarse. Lo encontrará en la consigna de llegada.',
          detail: 'Con 48 horas de antelación',
        },
      ],
      facts: [
        { label: 'Mostrador', value: 'Junto a la taquilla de acreditación' },
        { label: 'Tarifa', value: 'Incluida en su reserva' },
        { label: 'Resguardo', value: 'Numerado, uno por depósito' },
        { label: 'Objetos no retirados', value: 'Se conservan treinta días' },
      ],
      action: 'Consultar un envío',
      subject: 'Helix Transfer · Consigna y envíos',
    },
    conditions: {
      kicker: 'Condiciones de custodia',
      title: 'Qué puede dejarnos.',
      items: [
        {
          title: 'Se admite',
          text: 'Equipaje de mano, prendas de abrigo, dispositivos apagados y prótesis, apéndices o exoesqueletos desmontables.',
        },
        {
          title: 'No se admite',
          text: 'Alimentos perecederos, muestras sin etiquetar y organismos vivos, de cualquier tamaño o fase de desarrollo.',
        },
        {
          title: 'Recogida',
          text: 'Sin resguardo, Helix entregará sus pertenencias a quien acredite su identidad y describa el contenido. Los envases, solo a su titular.',
        },
      ],
    },
    note: 'Helix Transfer no abre los equipajes que custodia.',
  },
  {
    slug: 'kepler-liaison',
    name: 'Kepler Liaison',
    area: 'Coordinación',
    tagline: 'Para que todos nos entendamos.',
    intro:
      'Kepler Liaison coordina la presencia de organismos visitantes en las sesiones de AlienMilk: delegaciones institucionales, invitados de otros sistemas y colaboradores que viajan con comitiva propia. Se ocupa del protocolo, la interpretación y la adaptación de la sala, para que la convivencia transcurra con naturalidad.',
    website: 'www.keplerliaison.sol3',
    registry: { label: 'Acreditación de enlace', code: 'KL-0089' },
    service: {
      kicker: 'Servicios de enlace',
      title: ['Cada visitante,', 'en su elemento.'],
      copy: 'Desde la solicitud hasta la despedida, un mismo equipo acompaña a la delegación y habla con la sala en su nombre.',
      items: [
        {
          code: '01',
          title: 'Recepción de delegaciones',
          text: 'Acompaña a cada comitiva desde su llegada hasta el control de ingreso, con la acreditación tramitada de antemano.',
        },
        {
          code: '02',
          title: 'Interpretación',
          text: 'Simultánea, consecutiva o táctil, en más de cuarenta lenguas. Catorce de ellas, no verbales.',
        },
        {
          code: '03',
          title: 'Adaptación del puesto',
          text: 'Luz, temperatura, presión y gravedad ajustadas en los puestos reservados a visitantes.',
        },
        {
          code: '04',
          title: 'Calendario y costumbres',
          text: 'Asesoramiento sobre festividades, ciclos de descanso y gestos que conviene evitar en sala.',
        },
      ],
      facts: [
        { label: 'Atención', value: 'Según el ciclo local de cada sede' },
        { label: 'Cobertura', value: 'Todas las sedes de la red' },
        { label: 'Personal', value: 'Enlaces con acreditación AlienMilk' },
        { label: 'Tarifa', value: 'Incluida en las invitaciones institucionales' },
      ],
      action: 'Solicitar coordinación',
      subject: 'Kepler Liaison · Solicitud de coordinación',
    },
    conditions: {
      kicker: 'Condiciones de coordinación',
      title: 'Cómo se solicita.',
      items: [
        {
          title: 'Antelación',
          text: 'Envíe la solicitud al menos quince días antes de la sesión e indique cuántos miembros forman la comitiva y cuál es su procedencia.',
        },
        {
          title: 'Delegaciones numerosas',
          text: 'Las delegaciones de más de doce miembros, o de un único miembro de más de doce metros, requieren una visita técnica previa.',
        },
        {
          title: 'Confidencialidad',
          text: 'Kepler Liaison no revela la identidad de los visitantes ni el contenido de las conversaciones que interpreta.',
        },
      ],
    },
    note: 'Kepler Liaison y el Fondo Kepler para la Convivencia son entidades independientes.',
  },
];
