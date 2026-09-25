import { escalaAuditoria } from "@/lib/marca";

// ─────────────────────────────────────────────────────────────────────────
// EL PROMEDIO QUE NO PUEDE CRUZAR EL CORTE
//
// Desde agosto de 2026 la planilla de auditoría puntúa más exigente
// (`CORTE_AUDITORIAS`, en `marca.ts`). Un promedio que mezcle los dos lados no
// significa nada: son dos varas distintas midiendo la misma cosa.
//
// **El tipo de retorno es lo que impide el error, no una convención.** El caso
// `{ tipo: "mixto" }` NO tiene campo `valor`, así que una pantalla que quiera
// imprimir un número único sobre un conjunto que cruza el corte no compila. Un
// comentario que dijera «ojo, no promediar acá» dura hasta la próxima pantalla
// que alguien escriba apurado.
//
// Entra cualquier cosa con fecha y puntaje: el tipo es estructural, así que
// `AuditoriaFila` sirve sin que este módulo importe `data.ts` —que arrastra
// `next/headers` y no carga fuera de Next—.
// ─────────────────────────────────────────────────────────────────────────

export type FilaAuditoria = {
  audit_date: string | null;
  score_pct: number | null;
};

export type TramoAuditorias = {
  /** null solo si el tramo quedó vacío. */
  valor: number | null;
  visitas: number;
};

export type PromedioAuditorias =
  | { tipo: "unico"; escala: "anterior" | "nueva"; valor: number; visitas: number }
  | { tipo: "mixto"; anterior: TramoAuditorias; nueva: TramoAuditorias }
  | { tipo: "sin_dato" };

/** El promedio de una lista que ya se sabe que no está vacía. */
const media = (valores: number[]): number =>
  valores.reduce((a, v) => a + v, 0) / valores.length;

/**
 * El promedio de un conjunto de auditorías, partido por planilla si hace falta.
 *
 * Las filas sin puntaje y las de escala desconocida no entran a ningún tramo:
 * no se las asigna a un lado por defecto.
 */
export function promedioAuditorias(auditorias: FilaAuditoria[]): PromedioAuditorias {
  const anterior: number[] = [];
  const nueva: number[] = [];

  for (const a of auditorias) {
    if (a.score_pct === null) continue;
    const escala = escalaAuditoria(a.audit_date);
    if (escala === "anterior") anterior.push(a.score_pct);
    else if (escala === "nueva") nueva.push(a.score_pct);
  }

  if (anterior.length && nueva.length) {
    return {
      tipo: "mixto",
      anterior: { valor: media(anterior), visitas: anterior.length },
      nueva: { valor: media(nueva), visitas: nueva.length },
    };
  }
  if (nueva.length) {
    return { tipo: "unico", escala: "nueva", valor: media(nueva), visitas: nueva.length };
  }
  if (anterior.length) {
    return { tipo: "unico", escala: "anterior", valor: media(anterior), visitas: anterior.length };
  }
  return { tipo: "sin_dato" };
}

/** Todos los meses de un extremo al otro, incluidos los que no tienen auditorías. */
function mesesEntre(desde: string, hasta: string): string[] {
  const meses: string[] = [];
  let [anio, mes] = desde.split("-").map(Number);
  let actual = desde;
  while (actual <= hasta) {
    meses.push(actual);
    if (mes === 12) {
      anio++;
      mes = 1;
    } else {
      mes++;
    }
    actual = `${anio}-${String(mes).padStart(2, "0")}`;
  }
  return meses;
}

/**
 * El puntaje promedio de cada mes, del más viejo al más nuevo.
 *
 * Promedia DENTRO del mes, que nunca cruza el corte porque el corte cae en un
 * límite de mes. Un mes sin auditorías entre dos que sí las tienen queda en
 * `null`: `GraficoLinea` lo dibuja como hueco y no como cero.
 */
export function serieAuditorias(auditorias: FilaAuditoria[]): {
  meses: string[];
  valores: (number | null)[];
} {
  const porMes = new Map<string, number[]>();

  for (const a of auditorias) {
    if (a.score_pct === null || !a.audit_date) continue;
    if (escalaAuditoria(a.audit_date) === "desconocida") continue;
    const mes = a.audit_date.slice(0, 7);
    porMes.set(mes, [...(porMes.get(mes) ?? []), a.score_pct]);
  }

  const conDato = [...porMes.keys()].sort();
  if (!conDato.length) return { meses: [], valores: [] };

  const meses = mesesEntre(conDato[0], conDato[conDato.length - 1]);
  return {
    meses,
    valores: meses.map((m) => {
      const valores = porMes.get(m);
      return valores ? media(valores) : null;
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// EL HISTÓRICO DEL LOOKER (C17)
//
// Las auditorías de ene 2025 – jul 2026 se cargaron una sola vez desde la hoja
// «Puntaje auditorias» de la planilla del Looker
// (`scripts/cargar-historico-auditorias.ts`). Esa hoja trae solo el puntaje
// total: sin dimensiones, sin auditor. Una de sus fechas además se estimó.
//
// La marca vive en `source_sheet` para no cambiar el esquema de `audits`. El
// script y las pantallas leen los mismos dos textos de acá: si uno cambia, el
// otro no puede quedar desfasado.
// ─────────────────────────────────────────────────────────────────────────

export const ORIGEN_LOOKER = "Looker · histórico";
export const ORIGEN_LOOKER_FECHA_ESTIMADA = `${ORIGEN_LOOKER} · fecha estimada`;

type ConOrigen = { source_sheet: string | null };

/** La auditoría viene del histórico del Looker: tiene puntaje y nada más. */
export function esDelLooker(a: ConOrigen): boolean {
  return a.source_sheet?.startsWith(ORIGEN_LOOKER) ?? false;
}

/** El día de la auditoría no se sabe: se ubicó en su mes con una fecha estimada. */
export function tieneFechaEstimada(a: ConOrigen): boolean {
  return a.source_sheet === ORIGEN_LOOKER_FECHA_ESTIMADA;
}
