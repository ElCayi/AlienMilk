/**
 * Expediente ampliado de una sesión: todo lo que la ficha pública muestra y que la API de eventos
 * todavía no almacena (texto editorial, notas de cata, programa, equipo, condiciones...).
 *
 * Contrato pensado para un futuro `GET /api/eventos/{id}/expediente`. Mientras tanto se sirve desde
 * `public/data/session-dossiers.json`, que resuelve cada expediente en tres capas: `general` →
 * `porTipo[tipoEvento]` → `porSesion[idEvento]`. Una sesión nueva creada desde el panel de
 * administración hereda así el contenido de su tipo sin tocar el frontend.
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

export interface SessionStation {
  complemento: string;
  franja: string;
  operadores: SessionField[];
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
  estacion: SessionStation;
  creditos: string;
}

export type SessionDossierLayer = Partial<SessionDossier>;

export interface SessionDossierSource {
  general: SessionDossierLayer;
  porTipo: Record<string, SessionDossierLayer>;
  porSesion: Record<string, SessionDossierLayer>;
}
