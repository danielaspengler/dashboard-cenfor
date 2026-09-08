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
};

export async function getVisitas(): Promise<VisitaFila[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("mystery_shopper_visits")
    .select(
      "id, location_id, visit_date, evaluator, experience_type, score_pct, classification, sections, needs_review",
    )
    .order("visit_date", { ascending: false });
  return (data ?? []) as VisitaFila[];
}

export type AuditoriaFila = {
  id: string;
  location_id: string | null;
  audit_date: string;
  auditor: string | null;
  score_pct: number | null;
  source_sheet: string | null;
};

export async function getAuditorias(): Promise<AuditoriaFila[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("audits")
    .select("id, location_id, audit_date, auditor, score_pct, source_sheet")
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

// ─────────────────────────────────────────────────────────────────────────
// DELIVERY
//
// La unidad que se mide NO es el local: es el punto de venta —local + marca B
// + formato + canal—. Censurado Urca y Censurado Urca Turbo son dos tiendas
// distintas en Rappi, con su propia disponibilidad y sus propios reclamos, y
// el equipo las gestiona por separado. 22 puntos sobre 10 locales.
//
// Los períodos son MENSUALES y vienen cerrados por la planilla. Acá no se
// recalcula nada a partir de órdenes: se lee el resultado.
// ─────────────────────────────────────────────────────────────────────────

export type PuntoDeVenta = {
  id: string;
  location_id: string;
  channel: string;
  formato: "normal" | "turbo";
  name: string;
  local: string;
  marcaB: string | null;
  activo: boolean;
};

export type MetricaDelivery = {
  delivery_point_id: string;
  period_start: string;
  period_end: string;
  cancelaciones_pct: number | null;
  ordenes_canceladas: number | null;
  reclamos_pct: number | null;
  ordenes_con_reclamos: number | null;
  ordenes_mal_estado: number | null;
  ordenes_producto_diferente: number | null;
  ordenes_producto_faltante: number | null;
  disponibilidad_pct: number | null;
  ordenes_con_demora_pct: number | null;
  compensacion_pagada: number | null;
  reclamos_con_compensacion: number | null;
  calificacion_promedio: number | null;
  cantidad_resenas: number | null;
};

export type MotivoDelivery = {
  delivery_point_id: string;
  period_start: string;
  period_end: string;
  scope: "orden" | "producto";
  motivo: string;
  detalle: string;
  producto: string;
  cantidad_ordenes: number;
};

/** Postgres devuelve `numeric` como texto en algunos clientes. Se normaliza acá. */
const nro = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export async function getPuntosDeVenta(): Promise<PuntoDeVenta[]> {
  const supabase = await clienteDeLectura();
  const { data, error } = await supabase
    .from("delivery_points")
    .select("id, location_id, channel, formato, name, activo, locations(name), sub_brands(name)")
    .order("name");
  // Vienen TODOS, incluidos los inactivos. Alta Córdoba dejó de operar pero
  // tiene julio y agosto cargados: si la consulta los filtrara, esas filas
  // de indicadores quedarían en la pantalla sin nombre, como pasó la primera
  // vez que se dibujó. Quién entra a los promedios lo decide la pantalla.

  // Una consulta que falla devuelve `data` en null y la pantalla se dibuja
  // vacía sin decir nada. Al menos que quede en el log del servidor.
  if (error) console.error("delivery_points:", error.message);

  return (data ?? []).map((p) => ({
    id: p.id,
    location_id: p.location_id,
    channel: p.channel,
    formato: p.formato,
    name: p.name,
    activo: p.activo,
    local: (p.locations as unknown as { name: string } | null)?.name ?? "",
    marcaB: (p.sub_brands as unknown as { name: string } | null)?.name ?? null,
  })) as PuntoDeVenta[];
}

export async function getMetricasDelivery(): Promise<MetricaDelivery[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("delivery_metrics")
    .select("*")
    .order("period_start", { ascending: false });

  return (data ?? []).map((m) => ({
    ...m,
    cancelaciones_pct: nro(m.cancelaciones_pct),
    reclamos_pct: nro(m.reclamos_pct),
    disponibilidad_pct: nro(m.disponibilidad_pct),
    ordenes_con_demora_pct: nro(m.ordenes_con_demora_pct),
    compensacion_pagada: nro(m.compensacion_pagada),
    calificacion_promedio: nro(m.calificacion_promedio),
  })) as MetricaDelivery[];
}

export async function getMotivosDelivery(): Promise<MotivoDelivery[]> {
  const supabase = await clienteDeLectura();
  const { data } = await supabase
    .from("delivery_issues")
    .select("delivery_point_id, period_start, period_end, scope, motivo, detalle, producto, cantidad_ordenes")
    .order("cantidad_ordenes", { ascending: false });
  return (data ?? []) as MotivoDelivery[];
}

/** Los meses con datos, del más nuevo al más viejo, como "YYYY-MM". */
export function mesesConDatos(filas: { period_start: string }[]): string[] {
  return [...new Set(filas.map((f) => f.period_start.slice(0, 7)))].sort().reverse();
}

/**
 * Las filas de un mes, quedándose con **el cierre más reciente**.
 *
 * La planilla de motivos trae dos cargas de agosto, una cerrada al 24 y otra
 * al 31, y la segunda incluye a la primera (verificado: 27 órdenes al 24, 49
 * al 31). Sumar las dos contaría agosto casi dos veces; por eso se elige un
 * solo `period_end` por mes en vez de filtrar por rango de fechas.
 */
export function delMes<T extends { period_start: string; period_end: string }>(
  filas: T[],
  mes: string,
): T[] {
  const delMes = filas.filter((f) => f.period_start.slice(0, 7) === mes);
  if (!delMes.length) return [];
  const cierre = delMes.reduce((a, f) => (f.period_end > a ? f.period_end : a), "");
  return delMes.filter((f) => f.period_end === cierre);
}

export type ResumenDelivery = {
  puntos: number;
  calificacion: number | null;
  resenas: number;
  cancelaciones: number | null;
  reclamos: number | null;
  demora: number | null;
  disponibilidad: number | null;
  ordenesCanceladas: number;
  ordenesConReclamos: number;
  compensacion: number;
};

const promedio = (valores: (number | null)[]): number | null => {
  const v = valores.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

const suma = (valores: (number | null)[]): number =>
  valores.reduce<number>((a, b) => a + (b ?? 0), 0);

/**
 * El agregado de un mes.
 *
 * La calificación va **ponderada por cantidad de reseñas**, igual que el
 * promedio de Google del Resumen: un punto con 25 reseñas y otro con 8 no
 * pesan lo mismo.
 *
 * Los porcentajes van en promedio simple, y la pantalla lo dice. La planilla
 * no trae el total de órdenes de cada punto, así que no hay con qué ponderar;
 * derivarlo dividiendo las órdenes con reclamo por su porcentaje da cualquier
 * cosa cuando el porcentaje es cero. Antes de inventar un denominador, se
 * declara cómo está hecha la cuenta.
 */
export function resumirDelivery(metricas: MetricaDelivery[]): ResumenDelivery {
  const conResenas = metricas.filter((m) => m.calificacion_promedio !== null && m.cantidad_resenas);
  const resenas = suma(conResenas.map((m) => m.cantidad_resenas));

  return {
    puntos: metricas.length,
    calificacion: resenas
      ? suma(conResenas.map((m) => (m.calificacion_promedio ?? 0) * (m.cantidad_resenas ?? 0))) /
        resenas
      : null,
    resenas,
    cancelaciones: promedio(metricas.map((m) => m.cancelaciones_pct)),
    reclamos: promedio(metricas.map((m) => m.reclamos_pct)),
    demora: promedio(metricas.map((m) => m.ordenes_con_demora_pct)),
    disponibilidad: promedio(metricas.map((m) => m.disponibilidad_pct)),
    ordenesCanceladas: suma(metricas.map((m) => m.ordenes_canceladas)),
    ordenesConReclamos: suma(metricas.map((m) => m.ordenes_con_reclamos)),
    compensacion: suma(metricas.map((m) => m.compensacion_pagada)),
  };
}
