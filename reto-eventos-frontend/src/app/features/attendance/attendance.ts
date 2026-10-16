import { Credencial } from '../../models/api.models';

/**
 * Las credenciales que se admiten en el control de ingreso, con los nombres de la página de
 * Documentación (residentes en SOL-III, visitantes de otros sistemas, organismos colectivos).
 */
export const CREDENTIALS: { value: Credencial; label: string }[] = [
  { value: 'DNI_NIE', label: 'DNI o permiso de residencia (SOL-III)' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CREDENCIAL_TRANSITO', label: 'Salvoconducto de su punto de origen' },
  { value: 'ACREDITACION_COLONIA', label: 'Acreditación de portavoz (organismo colectivo)' },
];

export function credentialLabel(value: string): string {
  return CREDENTIALS.find((credential) => credential.value === value)?.label ?? value;
}
