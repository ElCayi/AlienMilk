export interface EventoListado {
  idEvento: number;
  nombre: string;
  fechaInicio: string;
  precio: number;
  aforoMaximo: number;
  estado: string;
  tipoEvento: string;
}

export interface EventoDetalle extends EventoListado {
  descripcion: string;
  duracion: number;
  direccion: string;
  minimoAsistencia: number;
  idTipo: number;
}

export interface Reserva {
  idReserva: number;
  idEvento: number;
  nombreEvento: string;
  username: string;
  cantidad: number;
  precioVenta: number;
  observaciones: string;
  fechaInicioEvento: string;
  estadoEvento: string;
}

export interface Perfil {
  idPerfil: number;
  nombre: string;
}

export interface TipoEvento {
  idTipo: number;
  nombre: string;
  descripcion: string;
}

export interface Usuario {
  username: string;
  email: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  enabled: number;
  fechaRegistro: string;
  idPerfil: number;
  perfil: string;
}

export interface AuthUser {
  username: string;
  nombre: string;
  perfil: string;
  authorities: string[];
}

export interface RegisterPayload {
  username: string;
  password: string;
  email: string;
  nombre: string;
  apellidos: string;
  direccion: string;
}

export interface UsuarioPayload {
  username: string;
  password?: string;
  email: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  enabled: number;
  fechaRegistro: string;
  idPerfil: number;
}

export interface TipoEventoPayload {
  nombre: string;
  descripcion: string;
}

export interface PerfilPayload {
  nombre: string;
}

export interface EventoPayload {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  duracion: number;
  direccion: string;
  estado: string;
  aforoMaximo: number;
  minimoAsistencia: number;
  precio: number;
  idTipo: number;
}

export interface Contacto {
  nombreSede: string;
  direccion: string;
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
