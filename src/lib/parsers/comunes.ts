// Utilidades compartidas por los tres parsers.
//
// Regla de oro heredada del maestro: los parsers son funciones puras.
// Reciben filas y devuelven objetos. No tocan la base ni la red, así que
// se pueden probar contra datos reales sin escribir nada.

/** Normaliza para comparar textos escritos por personas distintas. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Número de serie de Google Sheets a Date (UTC).
 * El día 0 de Sheets es el 30/12/1899; la parte decimal es la hora.
 *
 * Es la vía principal para leer fechas: las planillas de CENFOR tienen un
 * formato de celda roto ("AAAA" en vez del año) que hace que el texto
 * visible no traiga el año. El serial siempre lo trae.
 */
export function deSerialSheets(valor: unknown): Date | null {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").trim());
  // Rango sano: 1900-01-01 (2) hasta ~2124 (82000). Fuera de ahí es otra cosa
  // (un puntaje, un monto) que se coló en una columna de fecha.
  if (!Number.isFinite(n) || n < 2 || n > 82000) return null;
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

/**
 * Fechas. Acepta el número de serie de Sheets (lo habitual acá), ISO, o
 * texto argentino "27/8/2026". Devuelve "YYYY-MM-DD" o null: nunca adivina.
 */
export function aFechaISO(valor: unknown): string | null {
  const serial = deSerialSheets(valor);
  if (serial) return serial.toISOString().slice(0, 10);

  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  // Ya viene ISO (con o sin hora).
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // d/m/yyyy con hora opcional. Ojo: es día/mes, no mes/día.
  const ar = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ar) {
    const [, d, m, y] = ar;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

/** Marca temporal completa a ISO 8601, para ordenar visitas del mismo día. */
export function aTimestampISO(valor: unknown): string | null {
  const serial = deSerialSheets(valor);
  if (serial) return serial.toISOString();

  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  const ar = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (ar) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = ar;
    const p = (n: string, l = 2) => n.padStart(l, "0");
    return `${y}-${p(m)}-${p(d)}T${p(hh)}:${p(mm)}:${p(ss)}`;
  }

  const fecha = new Date(texto);
  return isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/**
 * Número desde una celda. Tolera "73%", "0,73", "$ 13.500" y espacios.
 * Devuelve null si no hay número — nunca 0, que sería un dato inventado.
 */
export function aNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  let texto = String(valor ?? "").trim();
  if (!texto) return null;

  const esPorcentaje = texto.includes("%");
  texto = texto.replace(/[^\d,.-]/g, "");
  if (!texto) return null;

  // Formato argentino: 1.234,56 → el punto es de miles.
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");

  const n = Number(texto);
  if (!Number.isFinite(n)) return null;
  return esPorcentaje ? n / 100 : n;
}

/**
 * Porcentaje siempre en escala 0–100.
 * Las planillas mezclan las dos escalas: "Puntaje final (%)" viene como
 * 0,73 y las auditorías como 0,7523, pero un día alguien puede formatear
 * la celda y que llegue "73%". Se acepta cualquiera de las tres.
 */
export function aPorcentaje(valor: unknown): number | null {
  const n = aNumero(valor);
  if (n === null) return null;
  return n <= 1 ? Math.round(n * 10000) / 100 : Math.round(n * 100) / 100;
}

/**
 * Mapa de nombre de columna → índice, a partir de la fila de encabezados.
 *
 * Los parsers buscan por nombre y no por posición fija. Es la lección que
 * dejó el sync de marketing del maestro: si alguien inserta una columna,
 * un parser posicional empieza a leer el dato equivocado sin dar error.
 */
export function mapaDeColumnas(encabezados: string[]): Map<string, number> {
  const mapa = new Map<string, number>();
  encabezados.forEach((h, i) => {
    const clave = normalizar(String(h ?? ""));
    if (clave && !mapa.has(clave)) mapa.set(clave, i);
  });
  return mapa;
}

/** Índice de la primera columna cuyo encabezado coincide con alguna opción. */
export function columna(
  mapa: Map<string, number>,
  ...nombres: string[]
): number | null {
  for (const n of nombres) {
    const i = mapa.get(normalizar(n));
    if (i !== undefined) return i;
  }
  return null;
}

/** Lo que un sync devuelve: qué guardó y, sobre todo, qué NO pudo guardar. */
export type ResultadoSync<T> = {
  filas: T[];
  descartadas: { motivo: string; detalle: string }[];
};
