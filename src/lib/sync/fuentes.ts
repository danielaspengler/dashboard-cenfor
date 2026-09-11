// Las seis planillas de CENFOR en Google Drive.
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
  deliveryRappi: "1axROvefosXxlhCiCqK9iTj4ulPaOvM-gMxYw2jirzjU",
  deliveryUber: "1ywM7qEAjxn75CEd3Q4av8wF4TLl0dpv7YvKWdE7PoEk",
  deliveryPedidosYa: "1l_ktEtd39w53NAuTDyFszLWIrWbyWTScsRlb_8XHkIk",
  // La que alimenta el Looker "Informe franquicias Censurado": ventas, costos
  // y rentabilidad por local y por mes. Es la primera fuente que no habla de
  // calidad sino de plata.
  economico: "1e6I4IBC-gTm-MBjbSpI7tV7WD0StCKZgaYL1hk26EmY",
} as const;

/** Hoja de la que sale cada cosa. */
export const HOJAS = {
  resenas: "resenas",
  snapshot: "Rating_Snapshot",
  mystery: "Puntajes por Visita",
  // De acá salen los nombres de las secciones del formulario. La hoja de
  // puntajes las titula "[TA] %Sec3"; el nombre que se le muestra al local
  // —"Asesoramiento", "Calidad de producto"— lo pone el cliente acá.
  mysteryConfig: "Configuración de Puntaje",
  // Las respuestas crudas del formulario. De acá salen los comentarios que
  // escribe el mystery shopper: la hoja de puntajes solo tiene números.
  mysteryRespuestas: "Respuestas de formulario 1",
  economico: "Agrupado Looker",
} as const;

/**
 * Canales de delivery. Solo Censurado vende por app.
 *
 * Cada canal tiene su planilla, su hoja y sus nombres de columna, porque cada
 * app arma los archivos a su manera: lo que Rappi llama "Punto de venta", las
 * otras dos lo llaman "Tienda". QUÉ indicadores tiene cada uno no está acá:
 * vive en `delivery_metric_defs`, en la base, para que sumar un indicador no
 * sea tocar código.
 *
 * El período también viene distinto. Rappi cierra por rango, con dos columnas
 * —agosto está cargado dos veces, al 24 y al 31—. Uber y PedidosYa traen un
 * mes solo, que el parser expande al mes completo.
 *
 * Los motivos de reclamo son propios de Rappi: las otras dos apps no los
 * publican.
 */
export const CANALES_DELIVERY = [
  {
    canal: "rappi",
    planilla: PLANILLAS.deliveryRappi,
    hojas: {
      metricas: "Rappi_Publicado",
      motivosOrdenes: "Rappi_Motivos_Ordenes",
      motivosProductos: "Rappi_Motivos_Productos",
    },
    columnas: { punto: "Punto de venta", inicio: "Período inicio", fin: "Período fin" },
  },
  {
    canal: "pedidos_ya",
    planilla: PLANILLAS.deliveryPedidosYa,
    hojas: { metricas: "Metricas_unificadas_CENFOR" },
    columnas: { punto: "Tienda", mes: "Fecha mes" },
  },
  {
    canal: "uber",
    planilla: PLANILLAS.deliveryUber,
    hojas: { metricas: "Hoja 1" },
    columnas: { punto: "Tienda", mes: "Periodo" },
  },
] as const;

/** Cómo se muestra cada canal. El orden es el de los botones del filtro. */
export const CANALES = [
  { id: "rappi", nombre: "Rappi" },
  { id: "pedidos_ya", nombre: "PedidosYa" },
  { id: "uber", nombre: "Uber" },
] as const;

export type Canal = (typeof CANALES)[number]["id"];

/** Las fuentes que el sync sabe correr. `?fuente=` acepta cualquiera de estas. */
export const FUENTES = [
  "resenas",
  "snapshots",
  "mystery",
  "auditorias",
  "delivery",
  "economico",
] as const;
export type Fuente = (typeof FUENTES)[number];
