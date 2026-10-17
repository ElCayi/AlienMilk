export interface EventoListado {
  idEvento: number;
  nombre: string;
  fechaInicio: string;
  /** La hora de inicio (HH:mm). Con la duración, da el horario: ver sessionSchedule. */
  horaInicio: string;
  precio: number;
  aforoMaximo: number;
  estado: string;
  tipoEvento: string;
  /** La foto propia subida desde el panel (nombre del archivo), o null si usa la de la web. */
  imagen?: string | null;
}

export interface EventoDetalle extends EventoListado {
  descripcion: string;
  duracion: number;
  direccion: string;
  minimoAsistencia: number;
  idTipo: number;
}

export type EstadoEvento = 'ACTIVO' | 'CANCELADO' | 'TERMINADO';

/**
 * Una sesión vista desde el panel de administración: todos sus datos y su ocupación. Con reservas no
 * se puede borrar (se cancela) ni bajar el aforo por debajo de las plazas reservadas.
 */
export interface EventoAdmin extends Omit<EventoDetalle, 'estado'> {
  estado: EstadoEvento;
  /** Fuera de la lista del panel, en «Archivadas» (solo las que ya no están activas). */
  archivada: boolean;
  plazasReservadas: number;
  reservas: number;
}

/** El documento que un participante presentará en el control de ingreso (nunca se guarda su número). */
export type Credencial = 'DNI_NIE' | 'PASAPORTE' | 'CREDENCIAL_TRANSITO' | 'ACREDITACION_COLONIA';

/** Un participante de una reserva: una plaza, un nombre. */
export interface Asistente {
  nombre: string;
  credencial: Credencial | '';
  procedencia: string | null;
  incompatibilidades: string | null;
  /** Cuándo pasó el control de ingreso; null si aún no ha entrado. Solo se lee: se marca en la hoja de control. */
  entradaEn?: string | null;
}

/** Lo que se envía desde el Registro de asistencia: un participante por plaza, contacto y conformidad. */
export interface RegistroAsistencia {
  cantidad: number;
  asistentes: Asistente[];
  telefono: string;
  adaptaciones: string;
  materialExterno: boolean;
  materialDescripcion: string;
  aceptaEdad: boolean;
  aceptaCondiciones: boolean;
  aceptaComunicaciones: boolean;
}

/** Lo que se corrige de una reserva; lo que no se manda se queda como está (ver ReservaEditarDto). */
export interface ReservaEditar {
  telefono: string;
  observaciones?: string;
  asistentes: Asistente[];
  idEvento?: number;
  cantidad?: number;
  adaptaciones?: string;
  materialExterno?: boolean;
  materialDescripcion?: string;
}

/** Pendiente: en la web, esperando a Stripe. Pagada: con tarjeta. En taquilla: del panel, se cobra al llegar. */
export type EstadoPago = 'PENDIENTE' | 'PAGADA' | 'EN_TAQUILLA' | 'COBRADA_TAQUILLA';

export interface Reserva {
  idReserva: number;
  idEvento: number;
  nombreEvento: string;
  username: string;
  /** Nombre y apellidos de la cuenta. */
  nombreCliente: string;
  cantidad: number;
  precioVenta: number;
  observaciones: string;
  fechaInicioEvento: string;
  horaInicioEvento: string;
  duracionEvento: number | null;
  /** El registro de asistencia; vacío en las reservas anteriores a él o tomadas desde el panel. */
  asistentes: Asistente[];
  telefono: string | null;
  adaptaciones: string | null;
  materialExterno: boolean;
  materialDescripcion: string | null;
  /** Cuándo se aceptaron la edad mínima y las condiciones de acceso. */
  conformidadEn: string | null;
  /** Con adaptaciones o material externo: AlienMilk tiene que evaluarla. */
  requiereRevision: boolean;
  /** La revisión de adaptaciones y material; null si no pide ninguna. */
  revision: 'PENDIENTE' | 'ACEPTADA' | 'NO_ACEPTADA' | null;
  /** La nota de la revisión, que ve también el cliente. */
  revisionNota: string | null;
  revisadaEn: string | null;
  estadoEvento: string;
  /** Si su sesión está archivada: sale de la vista diaria y se queda en el archivo con ella. */
  sesionArchivada: boolean;
  /** Cancelar no borra: la reserva se queda con cuándo, quién y por qué. Sin fecha, está viva. */
  canceladaEn: string | null;
  canceladaPor: 'CLIENTE' | 'ALIENMILK' | 'SISTEMA' | null;
  motivoCancelacion: string | null;
  /** El cobro, aparte del estado de la reserva: ver EstadoPago en el backend. */
  estadoPago: EstadoPago;
  /** La página de Stripe, solo mientras está pendiente de pago. */
  pagoUrl: string | null;
  pagoCaducaEn: string | null;
  pagadaEn: string | null;
  /** Lo devuelto: la diferencia si bajó el importe y, al cancelar, lo que quedaba. */
  importeDevuelto: number;
  /** En las reservas sin registrar, cuántas plazas han entrado ya (las registradas lo dicen por participante). */
  entradasSinRegistrar: number;
}

export interface Perfil {
  idPerfil: number;
  nombre: string;
  /** Cuentas con este perfil. */
  usuarios: number;
  /** Administrador o cliente: los que dan acceso; no se renombran ni se borran. */
  sistema: boolean;
}

export interface TipoEvento {
  idTipo: number;
  nombre: string;
  descripcion: string;
  /** Sesiones de este tipo; con alguna, no se puede borrar. */
  sesiones: number;
}

export interface Usuario {
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  enabled: number;
  /** Si quiere recibir el programa (solo lo cambia la propia persona). */
  aceptaComunicaciones?: boolean;
  fechaRegistro: string;
  idPerfil: number;
  perfil: string;
}

export interface AuthUser {
  username: string;
  nombre: string;
  perfil: string;
  authorities: string[];
  /** Si quiere recibir el programa de AlienMilk Sessions. */
  aceptaComunicaciones?: boolean;
}

export interface RegisterPayload {
  username: string;
  password: string;
  email: string;
  nombre?: string;
  apellidos?: string;
  direccion?: string;
}

/**
 * Formulario de una cuenta. La contraseña es obligatoria al dar de alta y, al editar, vacía conserva
 * la actual; la fecha de alta la pone el servidor.
 */
export interface UsuarioPayload {
  username: string;
  password: string;
  email: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  enabled: number;
  idPerfil: number | null;
}

export interface TipoEventoPayload {
  nombre: string;
  descripcion: string;
}

export interface PerfilPayload {
  nombre: string;
}

/** Formulario de una sesión. El estado no va aquí: cambia con las acciones de cancelar y reactivar. */
export interface EventoPayload {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  horaInicio: string;
  duracion: number | null;
  direccion: string;
  aforoMaximo: number | null;
  minimoAsistencia: number | null;
  precio: number | null;
  idTipo: number | null;
}

export interface Contacto {
  nombreSede: string;
  direccion: string;
  calle?: string | null;
  codigoPostal?: string | null;
  ciudad: string;
  email: string;
  telefono: string | null;
  /** ISO-8601: 1 = lunes … 7 = domingo. */
  diasApertura: number[];
  /** 'HH:mm' o 'HH:mm:ss'. */
  horaApertura: string;
  horaCierre: string;
  zonaHoraria: string;
  comoLlegar: string | null;
  condicionesAcceso: string | null;
  actualizadoEn: string | null;
  actualizadoPor: string | null;
}

export type ContactoPayload = Omit<Contacto, 'actualizadoEn' | 'actualizadoPor'>;

/** La red de confianza de la portada (/api/red-de-confianza). */
export interface RedConfianza {
  premios: { sigla: string; nombre: string; otorgante: string; fecha: string; descripcion: string | null }[];
  socios: { nombre: string; estilo: string; emblema: string }[];
  cifras: {
    clave: string;
    rotulo: string;
    /** Ya calculado: la «Continuidad», por ejemplo, llega en años, no como año de fundación. */
    valor: string;
    unidad: string | null;
    nota: string | null;
  }[];
}

/**
 * Formularios públicos. La definición llega del backend (resources/formularios/<clave>.json) y es la
 * única fuente de verdad: el formulario se pinta a partir de ella y el backend valida contra ella.
 */
export type TipoCampo = 'texto' | 'email' | 'texto-largo' | 'numero' | 'fecha' | 'seleccion';

export interface CampoFormulario {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido: boolean;
  /** En números, el valor mínimo. */
  minimo?: number;
  /** En números, el valor máximo; en textos, la longitud máxima. */
  maximo?: number;
  opciones?: string[];
  /** En fechas, si debe ser hoy o posterior. */
  desdeHoy?: boolean;
  ayuda?: string;
  /** 'mitad': comparte fila con el campo siguiente en pantallas anchas. */
  ancho?: 'mitad';
  autocompletar?: string;
}

export interface FormularioDefinicion {
  clave: string;
  titulo: string;
  organizacion: string;
  prefijo: string;
  introduccion?: string;
  accion: string;
  confirmacion: string;
  campos: CampoFormulario[];
}

export interface SolicitudPayload {
  valores: Record<string, string | number>;
  aceptaPrivacidad: boolean;
  /** Campo trampa: oculto para las personas, solo lo rellenan los robots. */
  web: string;
}

export interface SolicitudRecibida {
  referencia: string;
  organizacion: string;
  confirmacion: string;
}

export type EstadoSolicitud = 'NUEVA' | 'ATENDIDA';

export interface Solicitud {
  idSolicitud: number;
  referencia: string;
  formulario: string;
  asunto: string;
  nombre: string;
  email: string;
  datos: { clave: string; etiqueta: string; valor: string }[];
  estado: EstadoSolicitud;
  creadaEn: string;
  atendidaEn: string | null;
}

/** Cuerpo de error del backend; en los formularios, con un mensaje por campo. */
export interface ApiError {
  message?: string;
  errores?: Record<string, string>;
}

export type CategoriaProducto = 'LECHE' | 'DERIVADO' | 'MESA';

export interface Producto {
  slug: string;
  nombre: string;
  categoria: CategoriaProducto;
  resumen: string;
  descripcion: string;
  procedencia: string;
  formato: string;
  lote: string;
  conservacion: string;
  distribucion: string;
  advertencia: string | null;
  precio: number;
  existencias: number;
  /** Color de la muestra; lo pinta features/shop/shop-shared.css. */
  tono: string;
}

/** Reglas con las que el servidor calcula el pedido; llegan con el catálogo. */
export interface CondicionesTienda {
  gastosEnvio: number;
  envioGratisDesde: number;
  unidadesMaximas: number;
  /** Se paga con tarjeta en Stripe; si no, la tienda confirma sin cobrar (demostración). */
  pagoConTarjeta: boolean;
}

export interface CatalogoTienda {
  condiciones: CondicionesTienda;
  productos: Producto[];
}

export type EntregaPedido = 'ENVIO' | 'RECOGIDA';

export type EstadoPedido = 'PENDIENTE_PAGO' | 'CONFIRMADO' | 'ENVIADO' | 'ENTREGADO' | 'ANULADO';

export interface PedidoPayload {
  lineas: { producto: string; cantidad: number }[];
  entrega: EntregaPedido;
  direccion?: string;
  /** Solo sin sesión: el pedido es de invitado. */
  nombre?: string;
  correo?: string;
}

export interface LineaPedido {
  producto: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  importe: number;
}

export interface Pedido {
  idPedido: number;
  referencia: string;
  estado: EstadoPedido;
  entrega: EntregaPedido;
  direccion: string | null;
  subtotal: number;
  gastosEnvio: number;
  total: number;
  creadoEn: string;
  anuladoEn: string | null;
  /** Cuándo salió del centro de distribución y cuándo se entregó (o se recogió en la sede). */
  enviadoEn?: string;
  entregadoEn?: string;
  lineas: LineaPedido[];
  /** Pedido sin cuenta: se abre con su enlace privado, no está en ningún historial. */
  invitado: boolean;
  nombre: string | null;
  /** Mientras está pendiente de pago: la página de Stripe y hasta cuándo se puede pagar. */
  pagoUrl?: string;
  pagoCaducaEn?: string;
  /** La clave del enlace privado. Solo llega una vez, al crear un pedido de invitado. */
  clave?: string;
}

/**
 * Un pedido visto desde el centro de distribución (/admin). `siguiente` es el paso que le toca y
 * `anulable`, si aún se puede anular: las reglas las decide el servidor.
 */
export interface PedidoAdmin {
  pedido: Pedido;
  /** Usuario de la cuenta; vacío en los pedidos de invitado. */
  cuenta: string | null;
  correo: string | null;
  /** Cuándo se cobró con tarjeta; vacío en la tienda de demostración. */
  pagadoEn: string | null;
  reembolsado: boolean;
  siguiente: Extract<EstadoPedido, 'ENVIADO' | 'ENTREGADO'> | null;
  anulable: boolean;
}

/** Cifras de la cabecera del panel de administración; las dos últimas son también avisos del menú. */
export interface ResumenAdmin {
  sesionesActivas: number;
  plazasReservadas: number;
  pedidosPorPreparar: number;
  solicitudesNuevas: number;
}
