import { clienteDeLectura } from "@/lib/demo";

// ─────────────────────────────────────────────────────────────────────────
// DELIVERY
//
// Vive aparte de `data.ts` porque es otro modelo. El resto del tablero lee
// tablas con columnas fijas —una reseña tiene autor, fecha y puntaje—; acá
// los indicadores son datos: qué mide cada app está en `delivery_metric_defs`.
//
// La unidad que se mide NO es el local: es el punto de venta —local + marca B
// + formato + canal—. Censurado Urca y Censurado Urca Turbo son dos tiendas
// distintas en Rappi, y Censurado Urca existe además en PedidosYa y en Uber:
// tres tiendas, tres apps, tres mediciones que no se promedian entre sí.
//
// Estas funciones no saben qué es "reclamos" ni "tiempo en línea": leen el
// catálogo y lo aplican. Sumar un indicador es una fila en esa tabla.
//
// Los períodos son MENSUALES y vienen cerrados por la planilla. No se
// recalcula nada a partir de órdenes: se lee el resultado.
// ─────────────────────────────────────────────────────────────────────────

export type Unidad = "pct" | "conteo" | "pesos" | "minutos" | "puntaje" | "texto";

export type IndicadorDef = {
  id: string;
  channel: string;
  clave: string;
  nombre: string;
  unidad: Unidad;
  mejor_si_baja: boolean;
  destacado: boolean;
  orden: number;
  pondera_con: string | null;
  /**
   * Qué papel cumple en el score de calidad: calificacion, cancelados,
   * disponibilidad, tiempo_cerrado, pedidos_completados,
   * pedidos_no_completados. Null = se muestra pero no entra en ningún cálculo.
   */
  rol: string | null;
};

export type PuntoDeVenta = {
  id: string;
  location_id: string;
  channel: string;
  formato: "normal" | "turbo";
  name: string;
  local: string;
  localSlug: string;
  marcaB: string | null;
  activo: boolean;
};

export type ValorDelivery = {
  delivery_point_id: string;
  metric_def_id: string;
  period_start: string;
  period_end: string;
  valor: number | null;
  texto: string | null;
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

export async function getIndicadores(): Promise<IndicadorDef[]> {
  const supabase = await clienteDeLectura();
  const { data, error } = await supabase
    .from("delivery_metric_defs")
    .select(
      "id, channel, clave, nombre, unidad, mejor_si_baja, destacado, orden, pondera_con, rol",
    )
    .order("orden");
  if (error) console.error("delivery_metric_defs:", error.message);
  return (data ?? []) as IndicadorDef[];
}

export async function getPuntosDeVenta(): Promise<PuntoDeVenta[]> {
  const supabase = await clienteDeLectura();
  const { data, error } = await supabase
    .from("delivery_points")
    .select(
      "id, location_id, channel, formato, name, activo, locations(name, slug), sub_brands(name)",
    )
    .order("name");
  // Una consulta que falla devuelve `data` en null y la pantalla se dibuja
  // vacía sin decir nada. Al menos que quede en el log del servidor.
  if (error) console.error("delivery_points:", error.message);

  // Vienen TODOS, incluidos los inactivos. Alta Córdoba dejó de operar pero
  // tiene julio y agosto cargados: si la consulta los filtrara, esas filas de
  // indicadores quedarían en la pantalla sin nombre, como pasó la primera vez
  // que se dibujó. Quién entra a los promedios lo decide la pantalla.
  return (data ?? []).map((p) => ({
    id: p.id,
    location_id: p.location_id,
    channel: p.channel,
    formato: p.formato,
    name: p.name,
    activo: p.activo,
    local: (p.locations as unknown as { name: string } | null)?.name ?? "",
    localSlug: (p.locations as unknown as { slug: string } | null)?.slug ?? "",
    marcaB: (p.sub_brands as unknown as { name: string } | null)?.name ?? null,
  })) as PuntoDeVenta[];
}

export async function getValoresDelivery(): Promise<ValorDelivery[]> {
  const supabase = await clienteDeLectura();
  const { data, error } = await supabase
    .from("delivery_metric_values")
    .select("delivery_point_id, metric_def_id, period_start, period_end, valor, texto")
    .order("period_start", { ascending: false });
  if (error) console.error("delivery_metric_values:", error.message);
  return (data ?? []).map((v) => ({ ...v, valor: nro(v.valor) })) as ValorDelivery[];
}

export async function getMotivosDelivery(): Promise<MotivoDelivery[]> {
  const supabase = await clienteDeLectura();
  const { data, error } = await supabase
    .from("delivery_issues")
    .select(
      "delivery_point_id, period_start, period_end, scope, motivo, detalle, producto, cantidad_ordenes",
    )
    .order("cantidad_ordenes", { ascending: false });
  if (error) console.error("delivery_issues:", error.message);
  return (data ?? []) as MotivoDelivery[];
}

/** Los meses con datos, del más nuevo al más viejo, como "YYYY-MM". */
export function mesesConDatos(filas: { period_start: string }[]): string[] {
  return [...new Set(filas.map((f) => f.period_start.slice(0, 7)))].sort().reverse();
}

/**
 * Las filas de un mes, quedándose con **el cierre más reciente**.
 *
 * La planilla de motivos de Rappi trae dos cargas de agosto, una cerrada al 24
 * y otra al 31, y la segunda incluye a la primera (verificado: 27 órdenes al
 * 24, 49 al 31). Sumar las dos contaría agosto casi dos veces; por eso se
 * elige un solo `period_end` por mes en vez de filtrar por rango de fechas.
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

/** Un punto de venta con sus indicadores del período, por clave. */
export type FilaPunto = {
  punto: PuntoDeVenta;
  valores: Map<string, { valor: number | null; texto: string | null }>;
};

export function armarFilas(
  valores: ValorDelivery[],
  defs: IndicadorDef[],
  puntos: PuntoDeVenta[],
): FilaPunto[] {
  const defPorId = new Map(defs.map((d) => [d.id, d]));
  const puntoPorId = new Map(puntos.map((p) => [p.id, p]));
  const filas = new Map<string, FilaPunto>();

  for (const v of valores) {
    const def = defPorId.get(v.metric_def_id);
    const punto = puntoPorId.get(v.delivery_point_id);
    if (!def || !punto) continue;
    const fila = filas.get(punto.id) ?? { punto, valores: new Map() };
    fila.valores.set(def.clave, { valor: v.valor, texto: v.texto });
    filas.set(punto.id, fila);
  }
  return [...filas.values()];
}

/**
 * Los locales de un canal, para el filtro de la pantalla.
 *
 * Solo los que tienen al menos un punto de venta ABIERTO: Alta Córdoba tiene
 * julio y agosto cargados pero ya no opera, y ofrecerlo en el filtro sería
 * ofrecer un local cuyos números la pantalla saca de todos los promedios.
 *
 * Se identifican por el slug del local y no por su nombre: en el tablero
 * "Nueva Córdoba" existe en las dos marcas. Hoy delivery es solo Censurado,
 * pero el día que Formaggio venda por app el filtro ya no se confunde.
 */
export function localesDelCanal(
  puntos: PuntoDeVenta[],
): { slug: string; nombre: string; puntos: number }[] {
  const mapa = new Map<string, { slug: string; nombre: string; puntos: number }>();
  for (const p of puntos) {
    if (!p.activo || !p.localSlug) continue;
    const fila = mapa.get(p.localSlug) ?? { slug: p.localSlug, nombre: p.local, puntos: 0 };
    fila.puntos += 1;
    mapa.set(p.localSlug, fila);
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function valorDe(fila: FilaPunto, clave: string): number | null {
  return fila.valores.get(clave)?.valor ?? null;
}

/**
 * El agregado de un indicador sobre varios puntos de venta.
 *
 * Cómo se agrega lo dice la unidad, no una lista de casos especiales: los
 * conteos y los montos se **suman** —pedidos completados, compensación
 * pagada— y las tasas, duraciones y puntajes se **promedian**.
 *
 * El promedio va ponderado cuando el catálogo dice con qué (`pondera_con`).
 * La calificación de Rappi se pondera por cantidad de reseñas y la de
 * PedidosYa por N evaluaciones: un punto con 25 reseñas y otro con 1 no pesan
 * lo mismo. La de Uber va en promedio simple, porque Uber publica el Score
 * pero no cuántas evaluaciones lo forman. Es una diferencia real entre las
 * apps y la pantalla la declara en vez de disimularla.
 */
export function agregar(filas: FilaPunto[], def: IndicadorDef): number | null {
  if (def.unidad === "texto") return null;

  const valores = filas
    .map((f) => ({
      v: valorDe(f, def.clave),
      peso: def.pondera_con ? valorDe(f, def.pondera_con) : 1,
    }))
    .filter((x): x is { v: number; peso: number | null } => x.v !== null);

  if (!valores.length) return null;
  if (def.unidad === "conteo" || def.unidad === "pesos") {
    return valores.reduce((a, x) => a + x.v, 0);
  }

  if (def.pondera_con) {
    const conPeso = valores.filter((x) => x.peso !== null && x.peso > 0);
    // Si el indicador se pondera pero ningún punto trae el peso, no se cae al
    // promedio simple en silencio: no hay dato. Es lo que pasa en julio de
    // PedidosYa, que trae Score sin evaluaciones.
    if (!conPeso.length) return null;
    const total = conPeso.reduce((a, x) => a + (x.peso as number), 0);
    return conPeso.reduce((a, x) => a + x.v * (x.peso as number), 0) / total;
  }
  return valores.reduce((a, x) => a + x.v, 0) / valores.length;
}

/**
 * Cómo se escribe un valor según su unidad.
 *
 * Las duraciones se guardan siempre en minutos, pero 412 minutos se lee mal:
 * arriba de una hora se muestra como "6 h 52 m", que es lo que la planilla
 * muestra en pantalla.
 */
export function formatear(valor: number | null, unidad: Unidad): string | null {
  if (valor === null) return null;
  switch (unidad) {
    case "pct":
      return `${valor.toFixed(1)}%`;
    case "puntaje":
      return `${valor.toFixed(2)} ★`;
    case "pesos":
      return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(valor)}`;
    case "conteo":
      return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(valor);
    case "minutos": {
      if (valor < 60) return `${Math.round(valor)} min`;
      const h = Math.floor(valor / 60);
      const m = Math.round(valor - h * 60);
      return `${h} h ${String(m).padStart(2, "0")} m`;
    }
    default:
      return String(valor);
  }
}
