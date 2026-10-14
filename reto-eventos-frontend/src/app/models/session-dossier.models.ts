/**
 * Expediente ampliado de una sesión: todo lo que la ficha pública muestra además de los datos de la
 * sesión (texto editorial, notas de cata, programa, equipo, condiciones...).
 *
 * Llega del backend (`GET /api/eventos/expedientes`, ver ExpedienteCapaDto) y se edita desde el panel
 * de administración. Cada expediente se resuelve en tres capas: `general` → `porTipo[tipoEvento]` →
 * `porSesion[idEvento]`. Una sesión nueva creada desde el panel hereda así el contenido de su tipo.
 *
 * Cada capa sustituye los campos que declara, salvo `acceso` y `preguntas`, que se acumulan: las
 * condiciones generales siguen vigentes aunque una sesión añada las suyas.
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

export type SessionDossierLayer = Partial<SessionDossier>;

export interface SessionDossierSource {
  general: SessionDossierLayer;
  porTipo: Record<string, SessionDossierLayer>;
  porSesion: Record<string, SessionDossierLayer>;
}
