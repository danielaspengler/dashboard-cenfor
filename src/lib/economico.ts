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
// 2. LO QUE SE SUMA SE SUMA Y LO QUE SE PROMEDIA SE PONDERA. Las ventas y las
//    órdenes de varios locales se suman. El ticket promedio se recalcula como
//    ventas ÷ órdenes y los porcentajes se ponderan por ventas. El promedio de
//    los tickets promedio de seis locales no es el ticket promedio del grupo, y
//    la diferencia crece cuanto más distintos son los locales entre sí.
//
// 3. UN LOCAL SIN EL DATO NO ENTRA EN LA CUENTA DE ESE INDICADOR. Ni en el
//    numerador ni en el denominador. Todo pasa por `tieneDato()`.
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

export type Indicador =
  | "ventas"
  | "ordenes"
  | "ticket"
  | "costos_fijos_pct"
  | "costos_variables_pct"
  | "compras_ventas_pct"
  | "rentabilidad_neta_pct";

/** Un indicador del conjunto y qué locales lo tienen (ids de `locations`). */
export type Medida = { valor: number | null; conDato: string[]; sinDato: string[] };

export type Totales = {
  /** Los locales con alguna fila en el conjunto. */
  locales: string[];
  ventas: Medida;
  ordenes: Medida;
  /** Ventas ÷ órdenes, solo de las filas con órdenes. No es el promedio de los tickets. */
  ticket: Medida;
  costos_fijos_pct: Medida;
  costos_variables_pct: Medida;
  compras_ventas_pct: Medida;
  /** La de la planilla, ponderada por ventas. No se recalcula: los costos variables ya incluyen el CMV. */
  rentabilidad_neta_pct: Medida;
};

const positivo = (v: number | null): boolean => v !== null && v > 0;

/**
 * ¿Esta fila tiene el dato de este indicador?
 *
 * Es la única regla de «sin dato» del Resumen administrativo: tarjetas,
 * variación, gráficos y tabla pasan por acá, así no pueden contar distinto.
 *
 * - Un 0 en un porcentaje es sin dato. Enero–mayo 2025 traen los montos vacíos
 *   y los porcentajes en 0; Poeta Lugones julio 2026, los variables en 0.
 * - El ticket solo toma filas con órdenes: agosto 2026 trae dos locales con
 *   ventas y sin órdenes, y sus ventas inflaban el ticket de $27.827 a $40.970.
 * - Sin costos fijos o variables, la rentabilidad de la planilla no se cuenta
 *   (decidido por Daniela el 11/09/2026): Poeta Lugones julio 2026 declara
 *   93,57% con los variables en 0.
 */
export function tieneDato(f: FilaFinanciera, indicador: Indicador): boolean {
  switch (indicador) {
    case "ventas":
      return positivo(f.ventas);
    case "ordenes":
      return positivo(f.ordenes);
    case "ticket":
      return positivo(f.ordenes) && positivo(f.ventas);
    case "costos_fijos_pct":
    case "costos_variables_pct":
    case "compras_ventas_pct":
      return positivo(f[indicador]) && positivo(f.ventas);
    case "rentabilidad_neta_pct":
      return (
        f.rentabilidad_neta_pct !== null &&
        positivo(f.ventas) &&
        positivo(f.costos_fijos_pct) &&
        positivo(f.costos_variables_pct)
      );
  }
}

const idsDe = (filas: FilaFinanciera[]) => [...new Set(filas.map((f) => f.location_id ?? ""))];

function medir(filas: FilaFinanciera[], indicador: Indicador): Medida {
  const con = filas.filter((f) => tieneDato(f, indicador));
  const conDato = idsDe(con);
  const sinDato = idsDe(filas).filter((id) => !conDato.includes(id));
  if (!con.length) return { valor: null, conDato, sinDato };

  const suma = (g: (f: FilaFinanciera) => number | null) =>
    con.reduce((a, f) => a + (g(f) ?? 0), 0);
  const ventas = suma((f) => f.ventas);

  let valor: number;
  if (indicador === "ventas") valor = ventas;
  else if (indicador === "ordenes") valor = suma((f) => f.ordenes);
  else if (indicador === "ticket") valor = ventas / suma((f) => f.ordenes);
  // Ponderado por ventas: el porcentaje de un local que factura diez veces
  // más pesa diez veces más en el número del grupo.
  else valor = suma((f) => (f[indicador] ?? 0) * (f.ventas ?? 0)) / ventas;

  return { valor, conDato, sinDato };
}

/**
 * Los totales de un conjunto de filas —un mes, un local, o los dos.
 *
 * Los porcentajes son los de la planilla ponderados por ventas, en vez de
 * promediarlos entre locales: un local que factura $50M y otro que factura $5M
 * no pesan lo mismo en el margen del grupo. Donde el dato está completo da lo
 * mismo que dividir sumas de montos (agosto 2026: 26,79 de fijos por los dos
 * caminos); donde no, dividir sumas mete en el denominador las ventas de un
 * local sin costos (mayo 2025 daba 1,97% de fijos en vez de 20,86%).
 *
 * **La rentabilidad NO se recalcula: se toma la que declara la planilla.**
 * Intentar reconstruirla como «ventas − CMV − fijos − variables» da −37% sobre
 * el acumulado de 2026, y el motivo es que en esta planilla los costos
 * variables YA INCLUYEN el CMV: en junio de 2025 Nueva Córdoba facturó $57,3 M
 * con $26,2 M de CMV y $40,7 M de variables, que sumados a los fijos superan
 * la facturación. Restar el CMV aparte lo cuenta dos veces.
 */
export function totalizar(filas: FilaFinanciera[]): Totales {
  return {
    locales: idsDe(filas),
    ventas: medir(filas, "ventas"),
    ordenes: medir(filas, "ordenes"),
    ticket: medir(filas, "ticket"),
    costos_fijos_pct: medir(filas, "costos_fijos_pct"),
    costos_variables_pct: medir(filas, "costos_variables_pct"),
    compras_ventas_pct: medir(filas, "compras_ventas_pct"),
    rentabilidad_neta_pct: medir(filas, "rentabilidad_neta_pct"),
  };
}

/** Los meses con datos, del más nuevo al más viejo, como "YYYY-MM". */
export function mesesFinancieros(filas: FilaFinanciera[]): string[] {
  return [...new Set(filas.map((f) => f.period_start.slice(0, 7)))].sort().reverse();
}

export function delMesFinanciero(filas: FilaFinanciera[], mes: string): FilaFinanciera[] {
  return filas.filter((f) => f.period_start.slice(0, 7) === mes);
}

const EN_PESOS_O_CONTEO: Indicador[] = ["ventas", "ordenes", "ticket"];

/**
 * ¿La estructura de costos de esta fila está completa?
 *
 * Una fila con los fijos cargados y los variables en 0 declara un porcentaje
 * que existe pero describe medio mes: Poeta Lugones julio 2026 tiene $1,5 M de
 * fijos contra $7,1 M en agosto, y su 6,43% sale de esa carga a medias.
 * Es la misma condición que le saca la rentabilidad a la fila.
 */
const costosCompletos = (f: FilaFinanciera): boolean =>
  positivo(f.costos_fijos_pct) && positivo(f.costos_variables_pct);

/**
 * La variación de un indicador contra el mes anterior, SOLO sobre los locales
 * que lo tienen en los dos meses.
 *
 * Agosto 2026 trae dos locales sin órdenes: contra los seis de julio, las
 * órdenes caían 31%; sobre los mismos cuatro locales suben 0,24%. Un hueco de
 * carga no puede parecer una caída.
 *
 * **Los porcentajes además piden la estructura de costos completa en los dos
 * meses** (decidido por Daniela el 13/09/2026). Sin esa regla, Poeta Lugones
 * mostraba en agosto ▲27,9 puntos de costos fijos: la comparación contra su
 * julio incompleto, que se lee como un hecho del negocio. Si una fila no sirve
 * para la rentabilidad, tampoco sirve para comparar.
 *
 * Ventas, órdenes y ticket varían en %; los porcentajes, en puntos. `null` si
 * no hay mes anterior o ningún local tiene el dato en los dos.
 */
export function variacion(
  filasMes: FilaFinanciera[],
  filasPrevio: FilaFinanciera[],
  indicador: Indicador,
): { delta: number; locales: string[] } | null {
  const comparable = (f: FilaFinanciera) =>
    EN_PESOS_O_CONTEO.includes(indicador) || costosCompletos(f);
  const conDatoEn = (filas: FilaFinanciera[]) =>
    medir(filas.filter(comparable), indicador).conDato;
  const previos = conDatoEn(filasPrevio);
  const locales = conDatoEn(filasMes).filter((id) => previos.includes(id));
  if (!locales.length) return null;

  const delUniverso = (filas: FilaFinanciera[]) =>
    medir(filas.filter((f) => locales.includes(f.location_id ?? "")), indicador).valor;
  const actual = delUniverso(filasMes);
  const anterior = delUniverso(filasPrevio);
  if (actual === null || anterior === null) return null;

  const delta = EN_PESOS_O_CONTEO.includes(indicador)
    ? (actual / anterior - 1) * 100
    : actual - anterior;
  return { delta, locales };
}

/** El mes elegido y los 12 anteriores: se ve el mismo mes del año pasado (P3). */
export const MESES_SERIE = 13;

const indiceMes = (mes: string) => Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1;

/**
 * Los totales de cada mes con datos de la ventana que termina en `hasta`, del
 * más viejo al más nuevo. Sale de `totalizar()`: cada punto de un gráfico usa
 * el mismo criterio que las tarjetas.
 */
export function serieMensual(
  filas: FilaFinanciera[],
  hasta: string,
  meses = MESES_SERIE,
): { mes: string; totales: Totales }[] {
  const fin = indiceMes(hasta);
  return mesesFinancieros(filas)
    .filter((m) => indiceMes(m) <= fin && indiceMes(m) > fin - meses)
    .reverse()
    .map((mes) => ({ mes, totales: totalizar(delMesFinanciero(filas, mes)) }));
}

/** Pesos, sin centavos: a estos montos los decimales son ruido. */
export function pesos(valor: number | null): string | null {
  if (valor === null) return null;
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(valor)}`;
}

/** Porcentaje con coma y un decimal: "26,8%". `toFixed` escribiría "26.8". */
export function porcentaje(valor: number | null): string | null {
  if (valor === null) return null;
  return `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)}%`;
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
