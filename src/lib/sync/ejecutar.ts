import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSheetRanges, fetchSheetTitles, fetchSheetValues } from "@/lib/google/sheets";
import { aTimestampISO } from "@/lib/parsers/comunes";
import { parseResenas, parseSnapshot } from "@/lib/parsers/resenas";
import { parseMysteryShopper } from "@/lib/parsers/mystery";
import { esPestañaDeAuditoria, parseAuditorias, rangosDe } from "@/lib/parsers/auditorias";
import { parseDeliveryIssues, parseIndicadores } from "@/lib/parsers/delivery";
import { CANALES_DELIVERY, HOJAS, PLANILLAS, type Fuente } from "./fuentes";
import {
  cargarDirectorio,
  localPorAuditoria,
  localPorFormularioMS,
  puntoDelivery,
  type Directorio,
} from "./locales";

// El sync = leer la planilla + parsear + escribir. Las dos primeras partes ya
// estaban resueltas y probadas (`scripts/probar-parsers.ts`); esto es solo la
// tercera, que es la única que necesita `service_role` para saltear la RLS.
//
// Regla que se mantiene del script: nada se inventa. Una fila cuyo local no
// matchea NO se guarda con location_id nulo — se descarta y se informa, porque
// una fila huérfana ensucia todos los promedios sin que nadie lo note.

type Descarte = { motivo: string; detalle: string };

export type ReporteFuente = {
  fuente: Fuente;
  ok: boolean;
  leidas: number;
  guardadas: number;
  descartadas: Descarte[];
  error?: string;
};

/**
 * ignoreDuplicates en false a propósito, en las cuatro tablas: si el cliente
 * corrige un puntaje o una fecha en la planilla, la corrección tiene que
 * llegar al dashboard. Con true, el primer valor quedaría congelado para
 * siempre y nadie entendería por qué.
 */
async function guardar(
  supabase: SupabaseClient,
  tabla: string,
  filas: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  if (!filas.length) return;
  // De a 500 para no armar un request enorme si algún día crece el histórico.
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await supabase
      .from(tabla)
      .upsert(filas.slice(i, i + 500), { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`upsert en ${tabla}: ${error.message}`);
  }
}

async function syncResenas(
  supabase: SupabaseClient,
  dir: Directorio,
): Promise<ReporteFuente> {
  const valores = await fetchSheetValues(PLANILLAS.resenas, HOJAS.resenas);
  const { filas, descartadas } = parseResenas(valores);

  const aGuardar: Record<string, unknown>[] = [];
  for (const r of filas) {
    const location_id = dir.porPlaceId.get(r.place_id);
    if (!location_id) {
      // Pasa con Luuma, que todavía no tiene ficha de Google cargada.
      descartadas.push({ motivo: "place_id sin local en la base", detalle: r.place_id });
      continue;
    }
    aGuardar.push({
      location_id,
      google_review_id: r.google_review_id,
      author: r.author,
      review_date: r.review_date,
      rating: r.rating,
      text: r.text,
      source: "sheets:resenas",
    });
  }

  await guardar(supabase, "reviews", aGuardar, "google_review_id");
  return {
    fuente: "resenas",
    ok: true,
    leidas: Math.max(0, valores.length - 1),
    guardadas: aGuardar.length,
    descartadas,
  };
}

async function syncSnapshots(
  supabase: SupabaseClient,
  dir: Directorio,
): Promise<ReporteFuente> {
  const valores = await fetchSheetValues(PLANILLAS.resenas, HOJAS.snapshot);
  const { filas, descartadas } = parseSnapshot(valores);

  const aGuardar: Record<string, unknown>[] = [];
  for (const s of filas) {
    const location_id = dir.porPlaceId.get(s.place_id);
    if (!location_id) {
      descartadas.push({ motivo: "place_id sin local en la base", detalle: s.place_id });
      continue;
    }
    aGuardar.push({
      location_id,
      scraped_on: s.scraped_on,
      scraped_at: aTimestampISO(s.scraped_at),
      reviews_count: s.reviews_count,
      total_score: s.total_score,
    });
  }

  // Una fila por local y por día: si el scrapeo corre dos veces el mismo día,
  // la segunda pisa a la primera en vez de duplicar el punto de la serie.
  await guardar(supabase, "review_snapshots", aGuardar, "location_id,scraped_on");
  return {
    fuente: "snapshots",
    ok: true,
    leidas: Math.max(0, valores.length - 1),
    guardadas: aGuardar.length,
    descartadas,
  };
}

async function syncMystery(
  supabase: SupabaseClient,
  dir: Directorio,
): Promise<ReporteFuente> {
  // Dos planillas, una por marca. Solo Censurado tiene el bloque [DE] de
  // delivery; el formulario de Formaggio no lo incluye.
  const marcas = [
    { marca: "formaggio", planilla: PLANILLAS.msFormaggio, conBloques: false },
    { marca: "censurado", planilla: PLANILLAS.msCensurado, conBloques: true },
  ] as const;

  let leidas = 0;
  const descartadas: Descarte[] = [];
  const aGuardar: Record<string, unknown>[] = [];

  for (const { marca, planilla, conBloques } of marcas) {
    const valores = await fetchSheetValues(planilla, HOJAS.mystery);
    leidas += Math.max(0, valores.length - 1);
    const parseada = parseMysteryShopper(valores, { marca, conBloques });
    descartadas.push(...parseada.descartadas);

    for (const v of parseada.filas) {
      const location_id = localPorFormularioMS(dir, marca, v.ms_form_label);
      if (!location_id) {
        descartadas.push({
          motivo: `local del formulario sin equivalencia en ${marca}`,
          detalle: v.ms_form_label,
        });
        continue;
      }
      aGuardar.push({
        location_id,
        form_timestamp: v.form_timestamp,
        visit_date: v.visit_date,
        evaluator: v.evaluator,
        experience_type: v.experience_type,
        score_pct: v.score_pct,
        points_obtained: v.points_obtained,
        points_max: v.points_max,
        classification: v.classification,
        sections: v.sections,
        needs_review: v.needs_review,
        source: `sheets:ms-${marca}`,
        source_row_hash: v.source_row_hash,
      });
    }
  }

  await guardar(supabase, "mystery_shopper_visits", aGuardar, "source_row_hash");
  return { fuente: "mystery", ok: true, leidas, guardadas: aGuardar.length, descartadas };
}

async function syncAuditorias(
  supabase: SupabaseClient,
  dir: Directorio,
): Promise<ReporteFuente> {
  // La planilla es una plantilla con una pestaña por local y una sola
  // auditoría en cada una: la última. Cada corrida del sync archiva esa foto,
  // así la base se vuelve el historial que la planilla no tiene.
  const titulos = await fetchSheetTitles(PLANILLAS.auditorias);
  const pestañas = titulos.filter(esPestañaDeAuditoria);
  const rangos = await fetchSheetRanges(PLANILLAS.auditorias, pestañas.flatMap(rangosDe));
  const { filas, descartadas } = parseAuditorias(titulos, rangos);

  const aGuardar: Record<string, unknown>[] = [];
  for (const a of filas) {
    // Solo Censurado audita presencialmente; Formaggio no tiene pestañas acá.
    const location_id = localPorAuditoria(dir, "censurado", a.audit_sheet_label);
    if (!location_id) {
      descartadas.push({
        motivo: "campo LOCAL sin equivalencia en Censurado",
        detalle: `«${a.audit_sheet_label}» (pestaña «${a.source_sheet}»)`,
      });
      continue;
    }
    aGuardar.push({
      location_id,
      audit_date: a.audit_date,
      auditor: a.auditor,
      franchisee: a.franchisee,
      score_pct: a.score_pct,
      // La columna existía desde el esquema inicial y se guardaba vacía. El
      // desglose por dimensión es lo que el informe por local necesita para
      // decir DÓNDE se perdió el puntaje, no solo cuánto.
      categories: a.categories,
      source_sheet: a.source_sheet,
      source_row_hash: a.source_row_hash,
    });
  }

  await guardar(supabase, "audits", aGuardar, "source_row_hash");
  return {
    fuente: "auditorias",
    ok: true,
    leidas: pestañas.length,
    guardadas: aGuardar.length,
    descartadas,
  };
}

async function syncDelivery(
  supabase: SupabaseClient,
  dir: Directorio,
): Promise<ReporteFuente> {
  // Un canal por planilla, los tres por el mismo camino. Qué indicador tiene
  // cada uno sale del catálogo de la base, no de acá: sumar un indicador es
  // una fila en `delivery_metric_defs`.
  let leidas = 0;
  const descartadas: Descarte[] = [];
  const valoresAGuardar: Record<string, unknown>[] = [];
  const motivos: Record<string, unknown>[] = [];

  const { data: catalogo, error: errCatalogo } = await supabase
    .from("delivery_metric_defs")
    .select("id, channel, clave, unidad, sheet_header");
  if (errCatalogo) {
    throw new Error(`No se pudo leer el catálogo de indicadores: ${errCatalogo.message}`);
  }

  for (const { canal, planilla, hojas, columnas } of CANALES_DELIVERY) {
    const punto = (etiqueta: string) => puntoDelivery(dir, canal, etiqueta);
    const defs = (catalogo ?? []).filter((d) => d.channel === canal);
    if (!defs.length) {
      descartadas.push({
        motivo: `el canal ${canal} no tiene indicadores sembrados`,
        detalle: "sin catálogo no hay nada que leer de su planilla",
      });
      continue;
    }

    const valores = await fetchSheetValues(planilla, hojas.metricas);
    leidas += Math.max(0, valores.length - 1);
    const met = parseIndicadores(valores, defs, columnas);
    descartadas.push(...met.descartadas);

    for (const v of met.filas) {
      const delivery_point_id = punto(v.sheetLabel);
      if (!delivery_point_id) {
        descartadas.push({
          motivo: `punto de venta sin equivalencia en ${canal}`,
          detalle: v.sheetLabel,
        });
        continue;
      }
      valoresAGuardar.push({
        delivery_point_id,
        metric_def_id: v.metricDefId,
        period_start: v.periodStart,
        period_end: v.periodEnd,
        valor: v.valor,
        texto: v.texto,
        source_file_id: v.sourceFileId,
      });
    }

    // Los motivos de reclamo son solo de Rappi: las otras dos apps no los
    // publican, así que sus entradas no traen esas hojas.
    if (!("motivosOrdenes" in hojas)) continue;

    for (const [hoja, scope] of [
      [hojas.motivosOrdenes, "orden"],
      [hojas.motivosProductos, "producto"],
    ] as const) {
      const filas = await fetchSheetValues(planilla, hoja);
      leidas += Math.max(0, filas.length - 1);
      const res = parseDeliveryIssues(filas, scope);
      descartadas.push(...res.descartadas);

      for (const i of res.filas) {
        const delivery_point_id = punto(i.sheetLabel);
        if (!delivery_point_id) {
          descartadas.push({
            motivo: `punto de venta sin equivalencia en ${canal}`,
            detalle: `${i.sheetLabel} (${hoja})`,
          });
          continue;
        }
        motivos.push({
          delivery_point_id,
          period_start: i.periodStart,
          period_end: i.periodEnd,
          scope: i.scope,
          motivo: i.motivo,
          detalle: i.detalle,
          producto: i.producto,
          cantidad_ordenes: i.cantidadOrdenes,
          source_file_id: i.sourceFileId,
        });
      }
    }
  }

  await guardar(
    supabase,
    "delivery_metric_values",
    valoresAGuardar,
    "delivery_point_id,metric_def_id,period_start,period_end",
  );
  // El período completo entra en la clave: la planilla trae dos cargas de
  // agosto —cerrada al 24 y al 31— y sin el fin la segunda pisaría a la
  // primera.
  await guardar(
    supabase,
    "delivery_issues",
    motivos,
    "delivery_point_id,period_start,period_end,scope,motivo,detalle,producto",
  );

  return {
    fuente: "delivery",
    ok: true,
    leidas,
    guardadas: valoresAGuardar.length + motivos.length,
    descartadas,
  };
}

const CORREDORES: Record<
  Fuente,
  (s: SupabaseClient, d: Directorio) => Promise<ReporteFuente>
> = {
  resenas: syncResenas,
  snapshots: syncSnapshots,
  mystery: syncMystery,
  auditorias: syncAuditorias,
  delivery: syncDelivery,
};

/**
 * Corre las fuentes pedidas, cada una aislada de las otras.
 *
 * Si una planilla está rota o alguien le cambió el nombre a una hoja, esa
 * fuente falla y las otras tres se guardan igual. Un sync todo-o-nada haría
 * que un error en auditorías dejara al dashboard sin las reseñas del día.
 */
export async function ejecutarSync(
  supabase: SupabaseClient,
  fuentes: Fuente[],
): Promise<{ locales: number; resultados: ReporteFuente[] }> {
  const dir = await cargarDirectorio(supabase);
  const resultados: ReporteFuente[] = [];

  for (const fuente of fuentes) {
    try {
      resultados.push(await CORREDORES[fuente](supabase, dir));
    } catch (e) {
      resultados.push({
        fuente,
        ok: false,
        leidas: 0,
        guardadas: 0,
        descartadas: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { locales: dir.total, resultados };
}
