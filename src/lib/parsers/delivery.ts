// Parser de las planillas de delivery: Rappi, PedidosYa y Uber.
//
// Los tres canales entran por la MISMA función. Cada app publica indicadores
// distintos —13, 9 y 14, casi sin superposición—, así que en vez de un parser
// por canal con sus columnas escritas a mano, el catálogo de indicadores dice
// qué buscar: nombre del encabezado, unidad y cómo se llama el dato. Sumar un
// canal es sembrar sus indicadores, no escribir código.
//
// Como los otros parsers: funciones puras, columnas buscadas por nombre de
// encabezado, y el punto de venta se devuelve como el texto crudo de la
// planilla. Resolverlo contra `delivery_points` es trabajo del sync.

import {
  aFechaISO,
  aNumero,
  aPorcentaje,
  columna,
  mapaDeColumnas,
  type ResultadoSync,
} from "./comunes";

export type Unidad = "pct" | "conteo" | "pesos" | "minutos" | "puntaje" | "texto";

/** Un indicador del catálogo, tal como se necesita para leer la planilla. */
export type DefIndicador = {
  id: string;
  clave: string;
  unidad: Unidad;
  sheet_header: string;
};

/** Un valor leído: un indicador de un punto de venta en un período. */
export type ValorIndicador = {
  sheetLabel: string;
  periodStart: string;
  periodEnd: string;
  metricDefId: string;
  clave: string;
  valor: number | null;
  texto: string | null;
  sourceFileId: string | null;
};

/**
 * Cómo trae el período cada planilla.
 *
 * Rappi cierra por rango y trae dos columnas —agosto viene cargado dos veces,
 * al 24 y al 31—. Uber y PedidosYa traen un solo mes (`07/2026`, `2026-07`),
 * que se expande al mes completo. Expandirlo acá y no en la base deja a las
 * tres planillas guardadas igual, con inicio y fin.
 */
export type ColumnasDelivery =
  | { punto: string; inicio: string; fin: string }
  | { punto: string; mes: string };

const texto = (v: unknown) => String(v ?? "").trim();

/** Último día del mes de una fecha ISO, como "YYYY-MM-DD". */
function finDeMes(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

/**
 * El valor de una celda según la unidad del indicador.
 *
 * Se convierte al LEER y no al mostrar: un porcentaje siempre queda en 0–100 y
 * una duración siempre en minutos. Si la conversión viviera en la pantalla,
 * cada lugar que muestre el dato tendría que repetirla, y el primero que se
 * olvide muestra 0,0219%.
 *
 * Las duraciones vienen como fracción de día, que es como Sheets guarda una
 * hora: 0,019444 es 0:28:00, o sea 28 minutos.
 */
function convertir(celda: unknown, unidad: Unidad): { valor: number | null; texto: string | null } {
  if (unidad === "texto") {
    const t = texto(celda);
    return { valor: null, texto: t || null };
  }
  if (unidad === "pct") return { valor: aPorcentaje(celda), texto: null };
  if (unidad === "minutos") {
    const n = aNumero(celda);
    return { valor: n === null ? null : Math.round(n * 1440 * 10) / 10, texto: null };
  }
  return { valor: aNumero(celda), texto: null };
}

/**
 * Una hoja de indicadores, leída con el catálogo de su canal.
 *
 * Devuelve un valor por indicador con dato: una celda vacía no genera fila.
 * "Woops Nueva Córdoba" trae `-` en Score con 0 evaluaciones — es una tienda
 * sin actividad, y guardar un cero diría que la calificaron con cero.
 */
export function parseIndicadores(
  filas: string[][],
  defs: DefIndicador[],
  columnas: ColumnasDelivery,
): ResultadoSync<ValorIndicador> {
  const salida: ValorIndicador[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];
  if (filas.length < 2) return { filas: salida, descartadas };

  const mapa = mapaDeColumnas(filas[0]);
  const iPunto = columna(mapa, columnas.punto);
  const porRango = "inicio" in columnas;
  const iInicio = porRango ? columna(mapa, columnas.inicio) : columna(mapa, columnas.mes);
  const iFin = porRango ? columna(mapa, columnas.fin) : iInicio;

  if (iPunto === null || iInicio === null || iFin === null) {
    descartadas.push({
      motivo: "faltan columnas obligatorias",
      detalle: `se esperaba ${Object.values(columnas).join(" · ")}`,
    });
    return { filas: salida, descartadas };
  }

  // Encabezado que falta: se avisa UNA vez, no una por fila. Es el aviso de
  // que el cliente renombró una columna, y repetido 30 veces no se lee.
  const presentes: { def: DefIndicador; i: number }[] = [];
  for (const def of defs) {
    const i = columna(mapa, def.sheet_header);
    if (i === null) {
      descartadas.push({
        motivo: "columna del catálogo que no está en la planilla",
        detalle: `${def.clave} · se buscaba "${def.sheet_header}"`,
      });
      continue;
    }
    presentes.push({ def, i });
  }

  const iArchivo = columna(mapa, "ID archivo origen");

  for (const fila of filas.slice(1)) {
    const sheetLabel = texto(fila[iPunto]);
    if (!sheetLabel) continue; // fila en blanco al final de la hoja

    // Fila SIN período: se saltea en silencio. Las planillas traen la lista de
    // tiendas repetida para los meses que todavía no llegaron —176 filas en
    // PedidosYa— y tres tiendas de Uber que operan pero no vendieron. Contar
    // eso como descarte llenaría el aviso de ruido y nadie volvería a mirarlo.
    if (!texto(fila[iInicio])) continue;

    let periodStart = aFechaISO(fila[iInicio]);
    let periodEnd = porRango ? aFechaISO(fila[iFin]) : null;
    if (periodStart && !porRango) {
      periodStart = `${periodStart.slice(0, 7)}-01`;
      periodEnd = finDeMes(periodStart);
    }
    if (!periodStart || !periodEnd) {
      descartadas.push({
        motivo: "período ilegible",
        detalle: `${sheetLabel} · ${texto(fila[iInicio])}${porRango ? ` → ${texto(fila[iFin])}` : ""}`,
      });
      continue;
    }

    const sourceFileId = iArchivo === null ? null : texto(fila[iArchivo]) || null;

    for (const { def, i } of presentes) {
      const { valor, texto: t } = convertir(fila[i], def.unidad);
      if (valor === null && t === null) continue;
      salida.push({
        sheetLabel,
        periodStart,
        periodEnd,
        metricDefId: def.id,
        clave: def.clave,
        valor,
        texto: t,
        sourceFileId,
      });
    }
  }

  return { filas: salida, descartadas };
}

export type FilaMotivo = {
  sheetLabel: string;
  periodStart: string;
  periodEnd: string;
  scope: "orden" | "producto";
  motivo: string;
  detalle: string;
  producto: string;
  cantidadOrdenes: number;
  sourceFileId: string | null;
};

/**
 * Hojas "Rappi_Motivos_Ordenes" y "Rappi_Motivos_Productos". Misma forma
 * salvo la columna Producto, así que las dos entran por acá con el `scope`
 * que las distingue. Rappi es el único canal que publica los motivos.
 *
 * El período completo —inicio y fin— forma parte de la identidad de la
 * fila: la planilla trae dos cargas de agosto, una cerrada al 24 y otra al
 * 31, y sin el fin la segunda pisaría a la primera.
 */
export function parseDeliveryIssues(
  filas: string[][],
  scope: "orden" | "producto",
): ResultadoSync<FilaMotivo> {
  const salida: FilaMotivo[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];
  if (filas.length < 2) return { filas: salida, descartadas };

  const mapa = mapaDeColumnas(filas[0]);
  const iPunto = columna(mapa, "Punto de venta");
  const iInicio = columna(mapa, "Período inicio", "Periodo inicio");
  const iFin = columna(mapa, "Período fin", "Periodo fin");
  const iMotivo = columna(mapa, "Motivo");
  const iDetalle = columna(mapa, "Detalle del motivo");
  const iProducto = columna(mapa, "Producto");
  const iCantidad = columna(mapa, "Cantidad de órdenes");
  const iArchivo = columna(mapa, "ID archivo origen");

  if (iPunto === null || iInicio === null || iFin === null || iMotivo === null) {
    descartadas.push({
      motivo: "faltan columnas obligatorias",
      detalle: "se esperaba Punto de venta · Período inicio · Período fin · Motivo",
    });
    return { filas: salida, descartadas };
  }

  for (const fila of filas.slice(1)) {
    const sheetLabel = texto(fila[iPunto]);
    if (!sheetLabel) continue;

    const periodStart = aFechaISO(fila[iInicio]);
    const periodEnd = aFechaISO(fila[iFin]);
    if (!periodStart || !periodEnd) {
      descartadas.push({
        motivo: "período ilegible",
        detalle: `${sheetLabel} · ${texto(fila[iInicio])} → ${texto(fila[iFin])}`,
      });
      continue;
    }

    const motivo = texto(fila[iMotivo]);
    if (!motivo) {
      descartadas.push({ motivo: "sin motivo", detalle: sheetLabel });
      continue;
    }

    salida.push({
      sheetLabel,
      periodStart,
      periodEnd,
      scope,
      motivo,
      detalle: iDetalle === null ? "" : texto(fila[iDetalle]),
      producto: iProducto === null ? "" : texto(fila[iProducto]),
      cantidadOrdenes: (iCantidad === null ? null : aNumero(fila[iCantidad])) ?? 0,
      sourceFileId: iArchivo === null ? null : texto(fila[iArchivo]) || null,
    });
  }

  return { filas: salida, descartadas };
}
