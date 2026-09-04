// Las cuatro planillas de CENFOR en Google Drive.
//
// Van en el código y no en variables de entorno a propósito: son parte de la
// definición del sync, no de la configuración del ambiente. Si el cliente
// reemplaza una planilla, cambia acá y queda en el historial de git — con una
// variable de entorno el cambio sería invisible.
//
// El permiso lo da la cuenta de servicio `cenfor-sync`, que está compartida
// como lectora en las cuatro.
export const PLANILLAS = {
  resenas: "1X4V6tnKixSKWQA4826sn6I5q7DvlBrKvLy91aAdTR7Y",
  msFormaggio: "1HrTI7falAXeRA27ptYsQFB5SSPj1qmXegSVaE39-FRs",
  msCensurado: "1qFA7u1Ztj498E80qcp5CzvsDppyFcowVnCR8lR-Rgq4",
  auditorias: "1iw9bqR5cz9GLo29agblb3mZKJ71XdG0eUBMgqeHl7XM",
} as const;

/** Hoja de la que sale cada cosa. */
export const HOJAS = {
  resenas: "resenas",
  snapshot: "Rating_Snapshot",
  mystery: "Puntajes por Visita",
} as const;

/** Las fuentes que el sync sabe correr. `?fuente=` acepta cualquiera de estas. */
export const FUENTES = ["resenas", "snapshots", "mystery", "auditorias"] as const;
export type Fuente = (typeof FUENTES)[number];
