// Carga ÚNICA del histórico de auditorías desde la planilla del Looker (C17).
//
// La planilla de auditoría que lee el sync guarda solo la última auditoría de
// cada local. Las de ene 2025 – jul 2026 viven únicamente en la hoja
// «Puntaje auditorias» del Looker. Este script las pasa a `audits` una vez.
// No es una fuente del sync: desde el corte la fuente sigue siendo la planilla
// de auditoría, que trae las dimensiones, y así no hay dos fuentes compitiendo
// por la misma auditoría.
//
//   npx tsx scripts/cargar-historico-auditorias.ts             (en seco, no escribe)
//   npx tsx scripts/cargar-historico-auditorias.ts --escribir
//
// En seco lee la base (locales y hashes ya guardados) pero no escribe nada.
// Correrlo dos veces con --escribir no duplica: el hash es local + fecha, el
// mismo formato del parser de auditorías.

import ExcelJS from "exceljs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CORTE_AUDITORIAS } from "../src/lib/marca.ts";
import { ORIGEN_LOOKER, ORIGEN_LOOKER_FECHA_ESTIMADA } from "../src/lib/auditorias.ts";
import { normalizar } from "../src/lib/parsers/comunes.ts";
import {
  cargarDirectorio,
  localPorAuditoria,
  localPorLooker,
  type Directorio,
} from "../src/lib/sync/locales.ts";

const ARCHIVO = "../../Agrupado Looker - Censurado.xlsx";
const HOJA = "Puntaje auditorias";

/**
 * Las dos fechas mal cargadas en la hoja, decididas por Daniela el 25/09/2026
 * (specs/C17-historico-auditorias/SPEC.md, decisiones 2 y 3).
 *
 * Van por número de fila y no como regla: cada una se corrigió mirando las
 * filas vecinas. Si la fila ya no tiene el local y la fecha originales, la
 * planilla cambió y el script frena en vez de corregir otra auditoría.
 */
const CORRECCIONES = [
  {
    fila: 66,
    local: "Nueva Cordoba",
    original: "2026-12-26",
    corregida: "2025-12-26",
    estimada: false,
    motivo: "está entre las filas de nov y dic 2025, y a dic 2025 le falta Nueva Córdoba",
  },
  {
    fila: 17,
    local: "Nueva Cordoba",
    original: "2025-02-28",
    corregida: "2025-03-28",
    estimada: true,
    motivo:
      "segunda Nueva Córdoba de febrero (94%), entre las filas de marzo, que no tiene Nueva Córdoba. El día no se sabe",
  },
] as const;

/**
 * Textos de la hoja que no resuelven con las columnas de `locations`.
 *
 * Alta Córdoba cerró y no tiene etiqueta de auditoría ni del Looker; se ubica
 * por slug. «Recta Martinolli» no va acá: ya es el `looker_label` de Recta.
 */
const SLUG_POR_TEXTO: Record<string, string> = {
  "alta cordoba": "censurado-alta-cordoba",
};

type Descarte = { fila: number; motivo: string };

type Auditoria = {
  fila: number;
  location_id: string;
  local: string;
  activo: boolean;
  audit_date: string;
  score_pct: number;
  source_sheet: string;
  source_row_hash: string;
};

type FilaLocal = { id: string; slug: string; name: string; activo: boolean };

/** El valor de una celda sin los envoltorios de exceljs (fórmula, texto enriquecido). */
function valorCelda(celda: ExcelJS.Cell): unknown {
  const v = celda.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return v.result;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
  }
  return v;
}

function aFecha(v: unknown): string | null {
  return v instanceof Date && !isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : null;
}

/** Las columnas por su encabezado: si alguien agrega una columna, no se corren. */
function columnas(hoja: ExcelJS.Worksheet): { fecha: number; local: number; puntaje: number } {
  const porNombre = new Map<string, number>();
  hoja.getRow(1).eachCell((celda, col) => porNombre.set(normalizar(String(valorCelda(celda))), col));
  const buscar = (nombre: string) => {
    const col = porNombre.get(nombre);
    if (!col) throw new Error(`La hoja «${HOJA}» no tiene la columna ${nombre.toUpperCase()}.`);
    return col;
  };
  return { fecha: buscar("fecha"), local: buscar("local"), puntaje: buscar("puntuacion") };
}

async function leerLocales(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("locations").select("id, slug, name, activo");
  if (error) throw new Error(`No se pudo leer locations: ${error.message}`);
  const filas = (data ?? []) as FilaLocal[];
  return { porId: new Map(filas.map((l) => [l.id, l])), porSlug: new Map(filas.map((l) => [l.slug, l])) };
}

async function hashesGuardados(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase.from("audits").select("source_row_hash");
  if (error) throw new Error(`No se pudo leer audits: ${error.message}`);
  return new Set((data ?? []).map((f) => String((f as { source_row_hash: string }).source_row_hash)));
}

/** Aplica una corrección de la lista, o frena si la fila no es la que se corrigió. */
function corregir(fila: number, local: string, fecha: string) {
  const c = CORRECCIONES.find((x) => x.fila === fila);
  if (!c) return { fecha, estimada: false };
  if (normalizar(local) !== normalizar(c.local) || fecha !== c.original) {
    throw new Error(
      `La fila ${fila} dice «${local}» ${fecha}; la corrección esperaba «${c.local}» ${c.original}. La hoja cambió: revisar antes de cargar.`,
    );
  }
  return { fecha: c.corregida, estimada: c.estimada };
}

type Locales = Awaited<ReturnType<typeof leerLocales>>;
type Lectura = { auditorias: Auditoria[]; descartes: Descarte[]; desdeElCorte: number };

/** Las filas de la hoja anteriores al corte, con las correcciones aplicadas. */
function leerAuditorias(hoja: ExcelJS.Worksheet, dir: Directorio, locales: Locales): Lectura {
  const col = columnas(hoja);
  const lectura: Lectura = { auditorias: [], descartes: [], desdeElCorte: 0 };
  const descartar = (fila: number, motivo: string) => void lectura.descartes.push({ fila, motivo });
  let aplicadas = 0;

  hoja.eachRow((row, n) => {
    if (n === 1) return;
    const fechaOriginal = aFecha(valorCelda(row.getCell(col.fecha)));
    const texto = String(valorCelda(row.getCell(col.local)) ?? "").trim();
    const puntaje = valorCelda(row.getCell(col.puntaje));
    // La hoja arrastra cientos de filas vacías con formato: no son descartes.
    if (!fechaOriginal && !texto && (puntaje === null || puntaje === "")) return;

    if (!fechaOriginal) return descartar(n, `sin fecha legible («${texto}»)`);
    if (typeof puntaje !== "number" || puntaje < 0 || puntaje > 1) {
      return descartar(n, `puntuación fuera de 0–1: ${String(puntaje)}`);
    }

    const { fecha, estimada } = corregir(n, texto, fechaOriginal);
    if (fecha !== fechaOriginal) aplicadas++;
    if (fecha >= CORTE_AUDITORIAS) return void lectura.desdeElCorte++;

    const slugExtra = SLUG_POR_TEXTO[normalizar(texto)];
    const location_id =
      localPorAuditoria(dir, "censurado", texto) ??
      localPorLooker(dir, "censurado", texto) ??
      (slugExtra ? locales.porSlug.get(slugExtra)?.id : undefined);
    const local = location_id ? locales.porId.get(location_id) : undefined;
    if (!location_id || !local) return descartar(n, `«${texto}» sin equivalencia en Censurado`);

    lectura.auditorias.push({
      fila: n,
      location_id,
      local: local.name,
      activo: local.activo,
      audit_date: fecha,
      score_pct: Math.round(puntaje * 10000) / 100,
      source_sheet: estimada ? ORIGEN_LOOKER_FECHA_ESTIMADA : ORIGEN_LOOKER,
      // El nombre de la BASE y no el de la hoja: «Recta Martinolli» y «Recta»
      // tienen que dar el mismo hash que la planilla de auditoría.
      source_row_hash: `auditoria|${normalizar(local.name)}|${fecha}`,
    });
  });

  if (aplicadas !== CORRECCIONES.length) {
    throw new Error(`Se aplicaron ${aplicadas} de ${CORRECCIONES.length} correcciones: la hoja cambió.`);
  }
  return lectura;
}

/** Dos filas con el mismo hash harían fallar el upsert entero: se frena antes. */
function sinRepetidos(auditorias: Auditoria[]) {
  const repetidos = auditorias.filter(
    (a, i) => auditorias.findIndex((b) => b.source_row_hash === a.source_row_hash) !== i,
  );
  if (repetidos.length) {
    throw new Error(
      `Dos auditorías del mismo local el mismo día: ${repetidos.map((a) => `fila ${a.fila} ${a.source_row_hash}`).join(", ")}`,
    );
  }
}

async function guardar(supabase: SupabaseClient, auditorias: Auditoria[]) {
  const { error } = await supabase.from("audits").upsert(
    auditorias.map((a) => ({
      location_id: a.location_id,
      audit_date: a.audit_date,
      auditor: null,
      franchisee: null,
      score_pct: a.score_pct,
      categories: null,
      source_sheet: a.source_sheet,
      source_row_hash: a.source_row_hash,
    })),
    { onConflict: "source_row_hash", ignoreDuplicates: false },
  );
  if (error) throw new Error(`upsert en audits: ${error.message}`);
  console.log(`\nEscritas ${auditorias.length} auditorías en audits.`);
}

async function main() {
  const flags = process.argv.slice(2);
  const desconocidas = flags.filter((f) => f !== "--escribir" && f !== "--seco");
  if (desconocidas.length) throw new Error(`Opción desconocida: ${desconocidas.join(" ")}`);
  const escribir = flags.includes("--escribir");

  process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  const supabase = createClient(url, clave);
  const [dir, locales, guardados] = await Promise.all([
    cargarDirectorio(supabase),
    leerLocales(supabase),
    hashesGuardados(supabase),
  ]);

  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(ARCHIVO);
  const hoja = libro.getWorksheet(HOJA);
  if (!hoja) throw new Error(`El archivo no tiene la hoja «${HOJA}».`);

  const { auditorias, descartes, desdeElCorte } = leerAuditorias(hoja, dir, locales);
  sinRepetidos(auditorias);
  informar(auditorias, descartes, desdeElCorte, guardados);

  if (!escribir) {
    console.log("\nEn seco: no se escribió nada. Para cargar: --escribir");
    return;
  }
  await guardar(supabase, auditorias);
}

const pct = (valores: number[]) =>
  valores.length ? `${(valores.reduce((a, v) => a + v, 0) / valores.length).toFixed(2)}%` : "—";

function contar(auditorias: Auditoria[], clave: (a: Auditoria) => string): [string, number][] {
  const conteo = new Map<string, number>();
  for (const a of auditorias) conteo.set(clave(a), (conteo.get(clave(a)) ?? 0) + 1);
  return [...conteo].sort(([a], [b]) => a.localeCompare(b));
}

function informar(auditorias: Auditoria[], descartes: Descarte[], desdeElCorte: number, guardados: Set<string>) {
  const activas = auditorias.filter((a) => a.activo);
  const nuevas = auditorias.filter((a) => !guardados.has(a.source_row_hash)).length;

  console.log(`Auditorías anteriores a ${CORTE_AUDITORIAS}: ${auditorias.length}`);
  console.log(`  de locales activos: ${activas.length} · de locales cerrados: ${auditorias.length - activas.length}`);
  console.log(`  ya en la base: ${auditorias.length - nuevas} · nuevas: ${nuevas}`);
  console.log(`Desde el corte (no se cargan, las trae la planilla de auditoría): ${desdeElCorte}`);
  console.log(`Descartadas: ${descartes.length}`);
  for (const d of descartes) console.log(`  · fila ${d.fila}: ${d.motivo}`);

  console.log("\nPor local");
  for (const [local, n] of contar(auditorias, (a) => `${a.local}${a.activo ? "" : " (cerrado)"}`)) {
    console.log(`  ${String(n).padStart(4)}  ${local}`);
  }
  console.log("\nPor mes · promedio de locales activos");
  for (const [mes, n] of contar(auditorias, (a) => a.audit_date.slice(0, 7))) {
    const delMes = activas.filter((a) => a.audit_date.startsWith(mes)).map((a) => a.score_pct);
    console.log(`  ${mes}  ${String(n).padStart(3)}  ${pct(delMes)} en ${delMes.length}`);
  }
  console.log(`\nPromedio de las ${activas.length} de locales activos: ${pct(activas.map((a) => a.score_pct))}`);

  console.log("\nCorregidas");
  for (const c of CORRECCIONES) {
    const a = auditorias.find((x) => x.fila === c.fila);
    console.log(`  fila ${c.fila}: ${c.original} → ${c.corregida} · ${a?.source_sheet ?? "NO CARGADA"} · ${c.motivo}`);
  }
}

// `exitCode` y no `process.exit()`: en Windows, salir con el fetch de Supabase
// todavía cerrando aborta Node («UV_HANDLE_CLOSING») y pisa el código de salida.
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
