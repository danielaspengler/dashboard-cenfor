// Los filtros del tablero viven en la URL (`?periodo=90d&marca=censurado`).
//
// Por qué en la URL y no en un estado de React: las pantallas son componentes
// de servidor que ya leen de Supabase. Con el filtro en la URL siguen siéndolo
// —solo los botones son cliente—, el link se puede compartir tal cual se está
// viendo, y el botón de atrás del navegador funciona solo.
//
// Un valor desconocido nunca rompe la pantalla: cae en el default.

export type Periodo = "todo" | "30d" | "90d" | "anio";

export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "anio", label: "Este año" },
];

/**
 * "Todo" es el default a propósito. Hoy hay 29 reseñas, 8 visitas y 6
 * auditorías, casi todas de un mismo mes: si el tablero abriera filtrado en
 * 30 días, la primera impresión sería un tablero vacío.
 */
export const PERIODO_POR_DEFECTO: Periodo = "todo";

export function leerPeriodo(valor: string | string[] | undefined): Periodo {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return PERIODOS.some((p) => p.id === v) ? (v as Periodo) : PERIODO_POR_DEFECTO;
}

/**
 * Fecha desde la que cuenta el período, como "YYYY-MM-DD", o null para "todo".
 * Se compara como texto contra las fechas de la base, que ya vienen en ese
 * formato: alcanza y evita líos de zona horaria.
 */
export function desdeDe(periodo: Periodo, hoy = new Date()): string | null {
  if (periodo === "todo") return null;
  if (periodo === "anio") return `${hoy.getFullYear()}-01-01`;
  const dias = periodo === "30d" ? 30 : 90;
  const d = new Date(hoy);
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * ¿Esta fila entra en el período?
 *
 * Una fila **sin fecha entra siempre**. Las planillas de CENFOR tienen el
 * formato de fecha roto y algún día puede llegar una fila sin fecha legible;
 * esconderla detrás de un filtro la haría desaparecer sin que nadie se entere.
 * Mejor que se vea de más y no de menos.
 */
export function enPeriodo(fecha: string | null | undefined, desde: string | null): boolean {
  if (!desde) return true;
  if (!fecha) return true;
  return fecha >= desde;
}

export function etiquetaDe(periodo: Periodo): string {
  return PERIODOS.find((p) => p.id === periodo)?.label ?? "Todo";
}

// ── Marca ────────────────────────────────────────────────────────────────
//
// "todas" es un valor real y no la ausencia de filtro: así el botón activo
// siempre es uno de los tres y no hay estado ambiguo.

export type FiltroMarcaValor = string; // "todas" | slug de la marca

export function leerMarca(
  valor: string | string[] | undefined,
  slugsValidos: string[],
): FiltroMarcaValor {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && slugsValidos.includes(v) ? v : "todas";
}

/** Lo que las páginas reciben de Next, ya normalizado. */
export type Busqueda = Record<string, string | string[] | undefined>;
