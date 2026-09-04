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

export type AuditoriaCruda = {
  audit_sheet_label: string;
  audit_date: string;
  auditor: string | null;
  franchisee: string | null;
  score_pct: number;
  source_sheet: string;
  source_row_hash: string;
};

export function esPestañaDeAuditoria(titulo: string): boolean {
  return !PESTAÑAS_IGNORADAS.includes(normalizar(titulo));
}

/** Rangos a pedir por pestaña, para traer todo en una sola llamada. */
export function rangosDe(titulo: string): string[] {
  return Object.values(CELDAS).map((celda) => `'${titulo}'!${celda}`);
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
      source_sheet: titulo,
      // Local + fecha: si vuelven a auditar el mismo local otro día, entra
      // como fila nueva y el histórico crece. Si el sync corre dos veces
      // sobre la misma auditoría, no duplica.
      source_row_hash: `auditoria|${normalizar(local)}|${fecha}`,
    });
  }

  return { filas, descartadas };
}
