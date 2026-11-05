import { EventoDetalle } from '../../models/api.models';
import { SessionDossierLayer } from '../../models/session-dossier.models';

/**
 * La vista previa de una sesión que se está editando en el panel: lo que hay en el formulario, sin guardar,
 * tal como lo enseñaría la página pública. El panel lo deja en localStorage y la página pública, abierta
 * con ?vista-previa=1 dentro del diálogo, lo lee; cada cambio le llega por el evento «storage».
 */
export const PREVIEW_KEY = 'am-vista-previa-sesion';
export const PREVIEW_PARAM = 'vista-previa';

export interface SessionPreview {
  /** Los datos, como los da la API; idEvento 0 si la sesión aún no existe. */
  detail: EventoDetalle;
  /** El expediente en edición (null: el de serie). */
  layer: SessionDossierLayer | null;
  /** La foto nueva, aún sin subir (una URL blob: del panel), o null para la que tenga. */
  imageUrl: string | null;
}

export function writePreview(preview: SessionPreview): void {
  try {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(preview));
  } catch {
    // Sin almacenamiento, la vista previa enseña lo que ya estaba guardado.
  }
}

export function readPreview(): SessionPreview | null {
  try {
    const raw = localStorage.getItem(PREVIEW_KEY);
    return raw ? (JSON.parse(raw) as SessionPreview) : null;
  } catch {
    return null;
  }
}
