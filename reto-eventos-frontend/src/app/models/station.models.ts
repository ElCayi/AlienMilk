/**
 * Estación de la red AlienMilk: un lugar donde se conservan muestras, se preparan experiencias o se
 * acogen sesiones. Describe el espacio, no las actividades que se celebran en él, y por eso es
 * independiente de los eventos.
 *
 * Contrato pensado para un futuro `GET /api/estaciones`. Mientras tanto se sirve desde
 * `public/data/stations.json` a través de `StationService`.
 */
export interface Estacion {
  /** Código de referencia, como una matrícula (p. ej. `EST-M1D·0007`): con él se busca la estación en la red. */
  codigo: string;
  /** Función del espacio en la red: sede central, estación de recepción, punto de colaboración… */
  tipo: string;
  sistema: string;
  planeta: string;
  /** Nombre del emplazamiento donde se encuentra el espacio. */
  sitio: string;
  /** Posición en el cielo (ascensión recta y declinación) o, en la Tierra, latitud y longitud. */
  coordenadas: string;
  descripcion: string;
  direccion: string;
  horaLocal: string;
  acceso: string;
}
