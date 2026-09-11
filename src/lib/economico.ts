import { clienteDeLectura } from "@/lib/demo";

// ─────────────────────────────────────────────────────────────────────────
// RESUMEN ADMINISTRATIVO
//
// Los números económicos de cada local, mes a mes: ventas, órdenes, ticket
// promedio, CMV, rentabilidad y estructura de costos.
//
// Es la primera área del tablero que no habla de calidad. Dos reglas que la
// separan del resto:
//
// 1. SOLO HAY DATOS DE SEIS LOCALES DE CENSURADO. Luuma no está en la planilla
//    y Formaggio no tiene números cargados. La pantalla lo dice; no dibuja
//    ceros para completar la grilla.
//
// 2. LO QUE SE SUMA SE SUMA Y LO QUE SE PROMEDIA SE PROMEDIA. Las ventas, las
//    órdenes y los costos de varios locales se suman. El ticket promedio y los
//    porcentajes NO: se recalculan sobre los totales. El promedio de los
//    tickets promedio de seis locales no es el ticket promedio del grupo, y la
//    diferencia crece cuanto más distintos son los locales entre sí.
// ─────────────────────────────────────────────────────────────────────────

export type FilaFinanciera = {
  location_id: string | null;
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
};

/** Postgres devuelve `numeric` como texto: se normaliza acá, como en delivery. */
const nro = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export async function getFinancieros(): Promise<FilaFinanciera[]> {
  const supabase = await clienteDeLectura();
  const { data, error } = await supabase
    .from("financials")
    .select(
      "location_id, period_start, ventas, ordenes, ticket_promedio, cmv, rentabilidad_neta_pct, costos_fijos, costos_variables, compras_ventas_pct, costos_fijos_pct, costos_variables_pct, tipo_local",
    )
    .order("period_start", { ascending: false });
  // Una consulta que falla devuelve `data` en null y la pantalla se dibuja
  // vacía sin decir nada. Al menos que quede en el log del servidor.
  if (error) console.error("financials:", error.message);

  return (data ?? []).map((f) => ({
    ...f,
    ventas: nro(f.ventas),
    ordenes: nro(f.ordenes),
    ticket_promedio: nro(f.ticket_promedio),
    cmv: nro(f.cmv),
    rentabilidad_neta_pct: nro(f.rentabilidad_neta_pct),
    costos_fijos: nro(f.costos_fijos),
    costos_variables: nro(f.costos_variables),
    compras_ventas_pct: nro(f.compras_ventas_pct),
    costos_fijos_pct: nro(f.costos_fijos_pct),
    costos_variables_pct: nro(f.costos_variables_pct),
  })) as FilaFinanciera[];
}

export type Totales = {
  locales: number;
  ventas: number | null;
  ordenes: number | null;
  /** Ventas ÷ órdenes del conjunto, no el promedio de los tickets. */
  ticket_promedio: number | null;
  cmv: number | null;
  costos_fijos: number | null;
  costos_variables: number | null;
  /** Sobre las ventas del conjunto. */
  cmv_pct: number | null;
  costos_fijos_pct: number | null;
  costos_variables_pct: number | null;
  /** (Ventas − CMV − costos fijos − variables) ÷ ventas. */
  rentabilidad_neta_pct: number | null;
};

/**
 * Los totales de un conjunto de filas —un mes, un local, o los dos.
 *
 * Los porcentajes se recalculan sobre los totales en vez de promediar los
 * porcentajes de cada local: un local que factura $50M y otro que factura $5M
 * no pesan lo mismo en el margen del grupo, y promediar sus porcentajes daría
 * un número que no le corresponde a nadie.
 *
 * **La rentabilidad NO se recalcula: se toma la que declara la planilla.**
 * Intentar reconstruirla como «ventas − CMV − fijos − variables» da −37% sobre
 * el acumulado de 2026, y el motivo es que en esta planilla los costos
 * variables YA INCLUYEN el CMV: en junio de 2025 Nueva Córdoba facturó $57,3 M
 * con $26,2 M de CMV y $40,7 M de variables, que sumados a los fijos superan
 * la facturación. Restar el CMV aparte lo cuenta dos veces.
 *
 * Mientras la composición exacta no esté confirmada con Daniela, el margen del
 * conjunto se informa como promedio ponderado por ventas de la rentabilidad de
 * cada local, que es el número de la planilla pesado por cuánto factura cada
 * uno. Queda anotado en `specs/C15-resumen-administrativo/SPEC.md`.
 */
export function totalizar(filas: FilaFinanciera[]): Totales {
  const suma = (f: (x: FilaFinanciera) => number | null): number | null => {
    const valores = filas.map(f).filter((v): v is number => v !== null);
    return valores.length ? valores.reduce((a, v) => a + v, 0) : null;
  };

  const ventas = suma((f) => f.ventas);
  const ordenes = suma((f) => f.ordenes);
  const cmv = suma((f) => f.cmv);
  const fijos = suma((f) => f.costos_fijos);
  const variables = suma((f) => f.costos_variables);
  const sobreVentas = (v: number | null) =>
    v === null || !ventas ? null : (v / ventas) * 100;

  // Ponderada por ventas: el margen de un local que factura diez veces más
  // pesa diez veces más en el número del grupo.
  const conMargen = filas.filter(
    (f) => f.rentabilidad_neta_pct !== null && f.ventas !== null && f.ventas > 0,
  );
  const ventasConMargen = conMargen.reduce((a, f) => a + (f.ventas as number), 0);

  return {
    locales: new Set(filas.map((f) => f.location_id)).size,
    ventas,
    ordenes,
    ticket_promedio: ventas !== null && ordenes ? ventas / ordenes : null,
    cmv,
    costos_fijos: fijos,
    costos_variables: variables,
    cmv_pct: sobreVentas(cmv),
    costos_fijos_pct: sobreVentas(fijos),
    costos_variables_pct: sobreVentas(variables),
    rentabilidad_neta_pct: ventasConMargen
      ? conMargen.reduce(
          (a, f) => a + (f.rentabilidad_neta_pct as number) * (f.ventas as number),
          0,
        ) / ventasConMargen
      : null,
  };
}

/** Los meses con datos, del más nuevo al más viejo, como "YYYY-MM". */
export function mesesFinancieros(filas: FilaFinanciera[]): string[] {
  return [...new Set(filas.map((f) => f.period_start.slice(0, 7)))].sort().reverse();
}

export function delMesFinanciero(filas: FilaFinanciera[], mes: string): FilaFinanciera[] {
  return filas.filter((f) => f.period_start.slice(0, 7) === mes);
}

/** Pesos, sin centavos: a estos montos los decimales son ruido. */
export function pesos(valor: number | null): string | null {
  if (valor === null) return null;
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(valor)}`;
}

/** Pesos abreviados para las tarjetas: "$ 188,5 M". */
export function pesosCortos(valor: number | null): string | null {
  if (valor === null) return null;
  const millones = valor / 1_000_000;
  if (Math.abs(millones) >= 1) {
    return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(millones)} M`;
  }
  return pesos(valor);
}
