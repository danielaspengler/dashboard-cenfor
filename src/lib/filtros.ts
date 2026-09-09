// Los filtros del tablero viven en la URL (`?mes=2026-08&marca=censurado`).
//
// Por qué en la URL y no en un estado de React: las pantallas son componentes
// de servidor que ya leen de Supabase. Con el filtro en la URL siguen siéndolo
// —solo los botones son cliente—, el link se puede compartir tal cual se está
// viendo, y el botón de atrás del navegador funciona solo.
//
// Un valor desconocido nunca rompe la pantalla: cae en el default.

// ── Mes ──────────────────────────────────────────────────────────────────
//
// El tablero se mira POR MES, no por ventanas móviles.
//
// Antes el filtro era Todo / 30 días / 90 días / Este año, y tenía dos
// problemas. Uno, que "30 días" es un recorte que se mueve solo: el mismo link
// muestra otra cosa la semana que viene, y una visita del 5 de agosto entra o
// sale según el día en que se mire. Dos, que los datos de delivery son cierres
// mensuales y no entraban en ese molde, así que esa sección tenía su propio
// filtro y el tablero hablaba dos idiomas.
//
// Ahora es uno solo: "Todo" o un mes calendario. Cada sección ofrece los meses
// que ella tiene cargados —Auditorías solo agosto, Delivery julio y agosto—,
// así nunca se elige un mes que va a salir vacío.

export const MES_TODO = "todo";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-08" → "Agosto 2026". "todo" → "Todo". */
export function etiquetaMes(mes: string): string {
  if (mes === MES_TODO) return "Todo";
  const [anio, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? m} ${anio}`;
}

/** Los meses que aparecen en una lista de fechas, del más nuevo al más viejo. */
export function mesesDeFechas(fechas: (string | null | undefined)[]): string[] {
  const meses = new Set<string>();
  for (const f of fechas) if (f) meses.add(f.slice(0, 7));
  return [...meses].sort().reverse();
}

/**
 * El mes elegido, o "todo".
 *
 * "Todo" es el default a propósito. Hoy hay 29 reseñas, 8 visitas y 6
 * auditorías repartidas en dos o tres meses: si el tablero abriera filtrado en
 * uno, la primera impresión sería un tablero medio vacío.
 *
 * Un mes que no está entre los disponibles —una URL vieja, un parámetro
 * escrito a mano— cae en "Todo" en vez de mostrar una pantalla en blanco.
 */
export function leerMesFiltro(
  valor: string | string[] | undefined,
  disponibles: string[],
): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && disponibles.includes(v) ? v : MES_TODO;
}

/**
 * ¿Esta fila entra en el mes elegido?
 *
 * Una fila **sin fecha entra siempre**. Las planillas de CENFOR tienen el
 * formato de fecha roto y algún día puede llegar una fila sin fecha legible;
 * esconderla detrás de un filtro la haría desaparecer sin que nadie se entere.
 * Mejor que se vea de más y no de menos.
 */
export function enMes(fecha: string | null | undefined, mes: string): boolean {
  if (mes === MES_TODO) return true;
  if (!fecha) return true;
  return fecha.slice(0, 7) === mes;
}

// ── Delivery: mes obligatorio ────────────────────────────────────────────
//
// Delivery usa el mismo control pero SIN "Todo": lo que publica cada app es un
// cierre mensual. "Todo" tendría que promediar agosto con julio, y el promedio
// de dos cierres no es un número que exista en ninguna app.

/** El mes elegido, o el más reciente con datos. `disponibles` viene del más nuevo al más viejo. */
export function leerMes(valor: string | string[] | undefined, disponibles: string[]): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && disponibles.includes(v) ? v : (disponibles[0] ?? "");
}

/** El mes anterior CON DATOS, para comparar. No es el mes calendario previo. */
export function mesAnterior(mes: string, disponibles: string[]): string | null {
  const i = disponibles.indexOf(mes);
  return i >= 0 && i + 1 < disponibles.length ? disponibles[i + 1] : null;
}

// ── Local (delivery) ─────────────────────────────────────────────────────
//
// Delivery mide puntos de venta, no locales: Urca tiene tres tiendas en Rappi
// —el local, su Turbo y la dark kitchen que cocina adentro— y cada una se mide
// aparte. Este filtro las junta: elegir un local es mirar todo lo que sale de
// esa cocina en esa app.
//
// Como "todas", "todos" es un valor real y no la ausencia de filtro.

export const LOCAL_TODOS = "todos";

/** El local elegido, o "todos". Un slug que este canal no tiene cae en "todos". */
export function leerLocal(
  valor: string | string[] | undefined,
  slugsValidos: string[],
): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && slugsValidos.includes(v) ? v : LOCAL_TODOS;
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
