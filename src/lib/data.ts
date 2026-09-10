import { clienteDeLectura } from "@/lib/demo";

// Consultas del área Operaciones.
//
// Todas leen con la sesión de la persona, así que la RLS es la que decide.
// Si su mail no está en `emails_autorizados`, estas funciones devuelven
// listas vacías: no hace falta chequear permisos acá además.

export type Marca = { id: string; slug: string; name: string };
export type Local = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  brand_id: string;
  google_place_id: string | null;
  audit_sheet_label: string | null;
  marca: string;
};

export async function getMarcasYLocales(): Promise<{ marcas: Marca[]; locales: Local[] }> {
  const supabase = await clienteDeLectura();
  const [{ data: marcas }, { data: locales }] = await Promise.all([
    supabase.from("brands").select("id, slug, name").order("name"),
    supabase
      .from("locations")
      .select("id, slug, name, city, brand_id, google_place_id, audit_sheet_label, brands(name)")
      .eq("activo", true)
      .order("name"),
  ]);

  return {
    marcas: marcas ?? [],
    locales: (locales ?? []).map((l) => ({
      ...l,
      marca: (l.brands as unknown as { name: string } | null)?.name ?? "",
    })) as Local[],
  };
}

export type ResenaFila = {
  id: string;
  location_id: string | null;
  author: string | null;
  review_date: string | null;
  rating: number | null;
  text: string | null;
};

export async function getResenas(limite = 200): Promise<ResenaFila[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("reviews")
    .select("id, location_id, author, review_date, rating, text")
    .order("review_date", { ascending: false })
    .limit(limite);
  return data ?? [];
}

export type SnapshotFila = {
  location_id: string;
  scraped_on: string;
  reviews_count: number | null;
  total_score: number | null;
};

/** Última foto del acumulado de Google por local. */
export async function getUltimosSnapshots(): Promise<Map<string, SnapshotFila>> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("review_snapshots")
    .select("location_id, scraped_on, reviews_count, total_score")
    .order("scraped_on", { ascending: false });

  const porLocal = new Map<string, SnapshotFila>();
  for (const fila of data ?? []) {
    if (!porLocal.has(fila.location_id)) porLocal.set(fila.location_id, fila);
  }
  return porLocal;
}

export type VisitaFila = {
  id: string;
  location_id: string | null;
  visit_date: string | null;
  evaluator: string | null;
  experience_type: "take_away" | "delivery";
  score_pct: number | null;
  classification: string | null;
  sections: Record<string, number> | null;
  needs_review: boolean;
  /** Lo que escribió el mystery shopper. Null en las visitas anteriores al 10/09/2026. */
  observaciones: string | null;
  lo_mejor: string | null;
  a_mejorar: string | null;
};

export async function getVisitas(): Promise<VisitaFila[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("mystery_shopper_visits")
    .select(
      "id, location_id, visit_date, evaluator, experience_type, score_pct, classification, sections, needs_review, observaciones, lo_mejor, a_mejorar",
    )
    .order("visit_date", { ascending: false });
  return (data ?? []) as VisitaFila[];
}

/** El desglose por dimensión que trae la tabla de resultados de la planilla. */
export type DimensionAuditoria = {
  letra: string;
  nombre: string;
  peso_pct: number | null;
  pct: number | null;
};

export type AuditoriaFila = {
  id: string;
  location_id: string | null;
  audit_date: string;
  auditor: string | null;
  score_pct: number | null;
  /** Vacío en las auditorías guardadas antes del 09/09/2026. */
  categories: DimensionAuditoria[] | null;
  source_sheet: string | null;
};

export async function getAuditorias(): Promise<AuditoriaFila[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("audits")
    .select("id, location_id, audit_date, auditor, score_pct, categories, source_sheet")
    .order("audit_date", { ascending: false });
  return data ?? [];
}

/**
 * Promedio que EXCLUYE las visitas marcadas para revisar.
 *
 * Una visita con `needs_review` tiene el puntaje mal calculado en la propia
 * planilla (su motor no encontró una respuesta en la tabla de puntajes).
 * Se muestra en el listado, para que se vea que la visita existió, pero no
 * entra a ningún promedio: un número mal calculado ensucia la lectura de
 * todo el local.
 */
export function promedioValido(visitas: VisitaFila[]): number | null {
  const validas = visitas.filter((v) => !v.needs_review && v.score_pct !== null);
  if (!validas.length) return null;
  return validas.reduce((a, v) => a + (v.score_pct ?? 0), 0) / validas.length;
}

export function promedioResenas(resenas: ResenaFila[]): number | null {
  const conPuntaje = resenas.filter((r) => r.rating !== null);
  if (!conPuntaje.length) return null;
  return conPuntaje.reduce((a, r) => a + (r.rating ?? 0), 0) / conPuntaje.length;
}
