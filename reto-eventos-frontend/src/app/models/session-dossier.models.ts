/**
 * Expediente ampliado de una sesión: todo lo que la ficha pública muestra además de los datos de la
 * sesión (texto editorial, notas de cata, programa, equipo, condiciones...).
 *
 * Cada sesión tiene el suyo, en el backend (`GET /api/eventos/{id}/expediente`). Se edita desde el
 * panel de administración: el de una sesión en Modificar sesión, y muchos a la vez en la edición en
 * lote. Lo que no tenga guardado sale vacío (ver buildSessionDossier).
 */
export interface SessionField {
  etiqueta: string;
  valor: string;
}

export interface SessionProgramStep {
  hora: string;
  titulo: string;
  detalle?: string;
}

export interface SessionQuestion {
  pregunta: string;
  respuesta: string;
}

/** Entidad que hace posible la sesión sin formar parte de ella: cede el espacio, financia, transporta... */
export interface SessionCollaborator {
  rol: string;
  nombre: string;
  detalle?: string;
}

export interface SessionDossier {
  entradilla: string;
  texto: string[];
  procedencia: string;
  horario: string;
  notasCata: SessionField[];
  programa: SessionProgramStep[];
  equipo: SessionField[];
  acceso: SessionField[];
  recomendaciones: string[];
  preguntas: SessionQuestion[];
  colaboradores: SessionCollaborator[];
  creditos: string;
}

/** Lo guardado de un expediente: los apartados que no tenga no llegan. */
export type SessionDossierLayer = Partial<SessionDossier>;

