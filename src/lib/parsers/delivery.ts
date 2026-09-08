// Parser de las planillas de delivery. Empieza por Rappi; PedidosYa y Uber
// van a tener su propia planilla y su propio parser, porque cada app arma
// los archivos a su manera.
//
// Como los otros tres parsers: funciones puras, columnas buscadas por
// nombre de encabezado, y el punto de venta se devuelve como el texto
// crudo de la planilla. Resolverlo contra `delivery_points` es trabajo del
// sync, no del parser.

import {
  aFechaISO,
  aNumero,
  aPorcentaje,
  columna,
  mapaDeColumnas,
  type ResultadoSync,
} from "./comunes";

export type FilaMetrica = {
  sheetLabel: string;
  periodStart: string;
  periodEnd: string;
  cancelacionesPct: number | null;
  ordenesCanceladas: number | null;
  reclamosPct: number | null;
  ordenesConReclamos: number | null;
  ordenesMalEstado: number | null;
  ordenesProductoDiferente: number | null;
  ordenesProductoFaltante: number | null;
  disponibilidadPct: number | null;
  ordenesConDemoraPct: number | null;
  compensacionPagada: number | null;
  reclamosConCompensacion: number | null;
  calificacionPromedio: number | null;
  cantidadResenas: number | null;
  sourceFileId: string | null;
};

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

const texto = (v: unknown) => String(v ?? "").trim();

/**
 * Hoja "Rappi_Publicado": un renglón por punto de venta y período, con los
 * trece indicadores ya calculados.
 *
 * Los porcentajes se guardan en escala 0–100 —la planilla los trae como
 * 0,0909— para que la pantalla no tenga que saber de dónde salió cada
 * número. La calificación promedio no se toca: es un puntaje de 1 a 5.
 */
export function parseDeliveryMetrics(filas: string[][]): ResultadoSync<FilaMetrica> {
  const salida: FilaMetrica[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];
  if (filas.length < 2) return { filas: salida, descartadas };

  const mapa = mapaDeColumnas(filas[0]);
  const iPunto = columna(mapa, "Punto de venta");
  const iInicio = columna(mapa, "Período inicio", "Periodo inicio");
  const iFin = columna(mapa, "Período fin", "Periodo fin");

  if (iPunto === null || iInicio === null || iFin === null) {
    descartadas.push({
      motivo: "faltan columnas obligatorias",
      detalle: "se esperaba Punto de venta · Período inicio · Período fin",
    });
    return { filas: salida, descartadas };
  }

  const num = (fila: string[], ...nombres: string[]) => {
    const i = columna(mapa, ...nombres);
    return i === null ? null : aNumero(fila[i]);
  };
  const pct = (fila: string[], ...nombres: string[]) => {
    const i = columna(mapa, ...nombres);
    return i === null ? null : aPorcentaje(fila[i]);
  };

  for (const fila of filas.slice(1)) {
    const sheetLabel = texto(fila[iPunto]);
    if (!sheetLabel) continue; // fila en blanco al final de la hoja

    const periodStart = aFechaISO(fila[iInicio]);
    const periodEnd = aFechaISO(fila[iFin]);
    if (!periodStart || !periodEnd) {
      descartadas.push({
        motivo: "período ilegible",
        detalle: `${sheetLabel} · ${texto(fila[iInicio])} → ${texto(fila[iFin])}`,
      });
      continue;
    }

    salida.push({
      sheetLabel,
      periodStart,
      periodEnd,
      cancelacionesPct: pct(fila, "Cancelaciones %"),
      ordenesCanceladas: num(fila, "Órdenes canceladas"),
      reclamosPct: pct(fila, "Reclamos %"),
      ordenesConReclamos: num(fila, "Órdenes con reclamos"),
      ordenesMalEstado: num(fila, "Órdenes mal estado"),
      ordenesProductoDiferente: num(fila, "Órdenes producto diferente"),
      ordenesProductoFaltante: num(fila, "Órdenes producto faltante"),
      disponibilidadPct: pct(fila, "Disponibilidad %"),
      ordenesConDemoraPct: pct(fila, "Órdenes con demora %"),
      compensacionPagada: num(fila, "Compensación pagada por restaurante"),
      reclamosConCompensacion: num(fila, "Cantidad reclamos con compensación"),
      calificacionPromedio: num(fila, "Calificación promedio"),
      cantidadResenas: num(fila, "Cantidad de reseñas"),
      sourceFileId: (() => {
        const i = columna(mapa, "ID archivo origen");
        return i === null ? null : texto(fila[i]) || null;
      })(),
    });
  }

  return { filas: salida, descartadas };
}

/**
 * Hojas "Rappi_Motivos_Ordenes" y "Rappi_Motivos_Productos". Misma forma
 * salvo la columna Producto, así que las dos entran por acá con el `scope`
 * que las distingue.
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
