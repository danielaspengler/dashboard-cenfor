import { aFechaISO, aPorcentaje, normalizar, type ResultadoSync } from "./comunes";

// FUENTE: planilla "Auditoria puntajes", una pestaña por local.
//
// Es la fuente más frágil de las tres, y por dos motivos:
//
// 1. NO ES UN REGISTRO, ES UNA PLANTILLA. Cada pestaña guarda UNA sola
//    auditoría: la última que se hizo en ese local. Cuando auditen de
//    nuevo, la anterior desaparece. Guardando cada corrida en la base con
//    dedup por local+fecha, el dashboard se convierte en el archivo
//    histórico que la planilla no tiene. Ese es el valor concreto de este
//    sync, más allá de mostrar el número de hoy.
//
// 2. LOS NOMBRES DE PESTAÑA NO SON CONFIABLES. "Gral Paz", "Nueva Cba",
//    "Check Luuma" no coinciden con ningún local. Por eso el local se lee
//    del campo LOCAL de adentro de la hoja, y las pestañas se recorren
//    todas: si mañana agregan "Poeta" o renombran una, el sync la levanta
//    sin que haya que tocar código.

/** Pestañas que no son auditorías de un local. */
const PESTAÑAS_IGNORADAS = ["check list", "checklist", "plantilla", "instrucciones"];

// Posiciones dentro de cada pestaña. Acá sí son fijas: es un formulario
// con celdas combinadas, no una tabla con encabezados que se puedan
// buscar por nombre. Si el cliente rediseña la plantilla, este sync deja
// de encontrar los campos y lo reporta en vez de inventar valores.
export const CELDAS = { local: "D3", fecha: "O4", auditor: "D5", franquiciado: "D4", puntaje: "Z6" };

// El bloque con el desglose por dimensión —«TABLA DE RESULTADOS»— NO está en
// la misma fila en todas las pestañas: arranca en la 113 en cinco locales y en
// la 83 en «Check Luuma». Por eso acá no hay una celda fija: se pide un rango
// ancho y el parser busca el encabezado por su texto, como hacen los demás.
const RANGO_DIMENSIONES = "A70:U140";

// Columnas de esa tabla, contadas desde la A del rango pedido.
const COL = { dimension: 1, peso: 12, alcanzado: 13 };

/**
 * Nombre corto de cada dimensión.
 *
 * La planilla las titula «A) INICIO DE LA AUDITORÍA - FORMALIDADES», que en una
 * tabla no entra. La letra es la llave estable: si el cliente reescribe el
 * título, la fila se sigue reconociendo. Un título con una letra que no esté
 * acá se guarda con el texto de la planilla, sin romper nada.
 */
const NOMBRES_DIMENSION: Record<string, string> = {
  A: "Formalidades",
  B: "Fachada y vidriera",
  C: "Mostrador",
  D: "Atención al cliente",
  E: "Sector de caja",
  F: "Cocina",
  G: "Stocks disponibles",
  H: "Elementos de seguridad",
  I: "Calif. final auditor",
};

export type Dimension = {
  /** La letra que la planilla le pone al bloque: A, B, C… */
  letra: string;
  nombre: string;
  /** Cuánto pesa en el puntaje final, en porcentaje. */
  peso_pct: number | null;
  /** Cuánto alcanzó el local, en porcentaje. */
  pct: number | null;
};

export type AuditoriaCruda = {
  audit_sheet_label: string;
  audit_date: string;
  auditor: string | null;
  franchisee: string | null;
  score_pct: number;
  /** El desglose por dimensión. Vacío si la pestaña no trae la tabla. */
  categories: Dimension[];
  source_sheet: string;
  source_row_hash: string;
};

export function esPestañaDeAuditoria(titulo: string): boolean {
  return !PESTAÑAS_IGNORADAS.includes(normalizar(titulo));
}

/** Rangos a pedir por pestaña, para traer todo en una sola llamada. */
export function rangosDe(titulo: string): string[] {
  return [
    ...Object.values(CELDAS).map((celda) => `'${titulo}'!${celda}`),
    `'${titulo}'!${RANGO_DIMENSIONES}`,
  ];
}

/**
 * El desglose por dimensión de una pestaña.
 *
 * Se ubica la fila de encabezados por su texto («DIMENSION AUDITADA») y de ahí
 * para abajo se toman las filas que empiezan con una letra y un paréntesis:
 * «A) INICIO DE LA AUDITORÍA - FORMALIDADES». La lista termina en la primera
 * fila que no tiene esa forma.
 *
 * Si la tabla no aparece, se devuelve una lista vacía en vez de un error: el
 * puntaje final —que es lo que el dashboard ya mostraba— sigue estando en su
 * celda, y una plantilla vieja no tiene por qué tumbar la fuente entera.
 */
function dimensionesDe(rangos: Record<string, string[][]>, titulo: string): Dimension[] {
  const bloque = rangos[`'${titulo}'!${RANGO_DIMENSIONES}`] ?? [];
  const iEncabezado = bloque.findIndex((f) =>
    normalizar(String(f?.[COL.dimension] ?? "")).startsWith("dimension auditada"),
  );
  if (iEncabezado === -1) return [];

  const dimensiones: Dimension[] = [];
  for (let i = iEncabezado + 1; i < bloque.length; i++) {
    const fila = bloque[i] ?? [];
    const etiqueta = String(fila[COL.dimension] ?? "").trim();
    const m = etiqueta.match(/^([A-Z])\)\s*(.+)$/);
    if (!m) break;
    dimensiones.push({
      letra: m[1],
      nombre: NOMBRES_DIMENSION[m[1]] ?? m[2].trim(),
      peso_pct: aPorcentaje(fila[COL.peso]),
      pct: aPorcentaje(fila[COL.alcanzado]),
    });
  }
  return dimensiones;
}

function valorDe(rangos: Record<string, string[][]>, titulo: string, celda: string): string {
  const v = rangos[`'${titulo}'!${celda}`];
  return String(v?.[0]?.[0] ?? "").trim();
}

export function parseAuditorias(
  titulos: string[],
  rangos: Record<string, string[][]>,
): ResultadoSync<AuditoriaCruda> {
  const filas: AuditoriaCruda[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];

  for (const titulo of titulos) {
    if (!esPestañaDeAuditoria(titulo)) continue;

    const local = valorDe(rangos, titulo, CELDAS.local);
    const fechaTexto = valorDe(rangos, titulo, CELDAS.fecha);
    const puntajeTexto = valorDe(rangos, titulo, CELDAS.puntaje);

    if (!local) {
      descartadas.push({ motivo: "pestaña sin campo LOCAL", detalle: titulo });
      continue;
    }
    const fecha = aFechaISO(fechaTexto);
    if (!fecha) {
      // Una auditoría sin fecha no se puede ubicar en la serie histórica
      // ni deduplicar. Se descarta y se avisa: es señal de plantilla a
      // medio completar, no de un error del sync.
      descartadas.push({ motivo: "sin fecha de auditoría", detalle: `${titulo} · ${local}` });
      continue;
    }
    const puntaje = aPorcentaje(puntajeTexto);
    if (puntaje === null) {
      descartadas.push({ motivo: "sin puntaje final", detalle: `${titulo} · ${local}` });
      continue;
    }

    filas.push({
      audit_sheet_label: local,
      audit_date: fecha,
      auditor: valorDe(rangos, titulo, CELDAS.auditor) || null,
      franchisee: valorDe(rangos, titulo, CELDAS.franquiciado) || null,
      score_pct: puntaje,
      categories: dimensionesDe(rangos, titulo),
      source_sheet: titulo,
      // Local + fecha: si vuelven a auditar el mismo local otro día, entra
      // como fila nueva y el histórico crece. Si el sync corre dos veces
      // sobre la misma auditoría, no duplica.
      source_row_hash: `auditoria|${normalizar(local)}|${fecha}`,
    });
  }

  return { filas, descartadas };
}
