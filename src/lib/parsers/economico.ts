import {
  aFechaISO,
  aNumero,
  columna,
  mapaDeColumnas,
  normalizar,
  type ResultadoSync,
} from "./comunes";

// FUENTE: la planilla que alimenta el Looker «Informe franquicias Censurado»,
// hoja «Agrupado Looker». Una fila por local y por mes.
//
// Es la primera fuente que no habla de calidad sino de plata, y la única que
// llega con el período ya resuelto en una columna de fecha.
//
// Dos cosas que hay que saber de esta planilla:
//
// 1. LOS PORCENTAJES VIENEN EN 0–1. Una rentabilidad de 0,118 es 11,8%. Se
//    normalizan acá, al guardar, para que la base hable la misma unidad que el
//    resto del tablero.
//
// 2. LA RENTABILIDAD PUEDE SER NEGATIVA, y `aPorcentaje` la escalaría mal: su
//    regla es "si el valor es <= 1 multiplicá por 100", y -0,073 pasa esa
//    prueba, pero -7,33 —un mes con pérdida ya convertido— también. Por eso
//    este parser usa su propia conversión sobre el valor crudo de la planilla,
//    que siempre viene en 0–1.

export type FilaEconomica = {
  looker_label: string;
  period_start: string;
  ventas: number | null;
  ordenes: number | null;
  ticket_promedio: number | null;
  cmv: number | null;
  rentabilidad_neta_pct: number | null;
  costos_fijos: number | null;
  costos_variables: number | null;
  compras_ventas_pct: number | null;
  costos_fijos_pct: number | null;
  costos_variables_pct: number | null;
  tipo_local: string | null;
  source_row_hash: string;
};

/** Una fracción de la planilla (0,118) llevada a porcentaje (11,8). Acepta negativos. */
function aPct(valor: unknown): number | null {
  const n = aNumero(valor);
  return n === null ? null : Math.round(n * 10000) / 100;
}

export function parseEconomico(valores: string[][]): ResultadoSync<FilaEconomica> {
  const filas: FilaEconomica[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];

  const encabezados = valores[0] ?? [];
  const mapa = mapaDeColumnas(encabezados);

  const cLocal = columna(mapa, "Local");
  const cFecha = columna(mapa, "Fecha");
  if (cLocal === null || cFecha === null) {
    throw new Error(
      "La hoja «Agrupado Looker» no tiene las columnas «Local» y «Fecha». " +
        "Cambió la estructura de la planilla.",
    );
  }

  // Las columnas se buscan por su nombre, no por su posición: la planilla es
  // de uso diario del cliente y una columna insertada en el medio no puede
  // hacer que el tablero empiece a leer ventas donde hay costos.
  const c = {
    ventas: columna(mapa, "Ventas"),
    ordenes: columna(mapa, "Ordenes", "Órdenes"),
    ticket: columna(mapa, "Ticket promedio"),
    cmv: columna(mapa, "CMV"),
    rentabilidad: columna(mapa, "Rentabilidad neta %"),
    costosFijos: columna(mapa, "Costos fijos"),
    costosVariables: columna(mapa, "Costos variables"),
    comprasVentas: columna(mapa, "Compras/ventas"),
    pctFijos: columna(mapa, "% costos fijos"),
    pctVariables: columna(mapa, "%costos variables", "% costos variables"),
    tipo: columna(mapa, "Tipo Local"),
  };

  const leer = (fila: string[], indice: number | null) =>
    indice === null ? null : fila[indice];

  for (let n = 1; n < valores.length; n++) {
    const fila = valores[n] ?? [];
    const local = String(fila[cLocal] ?? "").trim();
    if (!local) continue; // la planilla arrastra filas vacías hasta la 982

    const fecha = aFechaISO(fila[cFecha]);
    if (!fecha) {
      descartadas.push({ motivo: "sin fecha legible", detalle: `${local} · fila ${n + 1}` });
      continue;
    }
    // El dato es un cierre mensual: la fecha se lleva al primer día del mes,
    // que es como lo guardan delivery y el resto del tablero.
    const periodo = `${fecha.slice(0, 7)}-01`;

    const ventas = aNumero(leer(fila, c.ventas));
    // Una fila sin ventas es una fila de plantilla, no un mes con cero pesos
    // facturados. Se saltea en silencio: contarla como descarte llenaría de
    // ruido el aviso que importa, que es un local que dejó de matchear.
    if (ventas === null) continue;

    filas.push({
      looker_label: local,
      period_start: periodo,
      ventas,
      ordenes: aNumero(leer(fila, c.ordenes)),
      ticket_promedio: aNumero(leer(fila, c.ticket)),
      cmv: aNumero(leer(fila, c.cmv)),
      rentabilidad_neta_pct: aPct(leer(fila, c.rentabilidad)),
      costos_fijos: aNumero(leer(fila, c.costosFijos)),
      costos_variables: aNumero(leer(fila, c.costosVariables)),
      compras_ventas_pct: aPct(leer(fila, c.comprasVentas)),
      costos_fijos_pct: aPct(leer(fila, c.pctFijos)),
      costos_variables_pct: aPct(leer(fila, c.pctVariables)),
      tipo_local: String(leer(fila, c.tipo) ?? "").trim() || null,
      // Local + mes: si la planilla corrige el cierre de un mes, la corrección
      // pisa la fila vieja en vez de duplicarla.
      source_row_hash: `economico|${normalizar(local)}|${periodo}`,
    });
  }

  return { filas, descartadas };
}
