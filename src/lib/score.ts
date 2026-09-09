import { PESOS_SCORE, type EjeScore } from "@/lib/marca";
import type { AuditoriaFila, SnapshotFila, VisitaFila } from "@/lib/data";
import {
  delMes,
  valorDe,
  armarFilas,
  type FilaPunto,
  type IndicadorDef,
  type PuntoDeVenta,
  type ValorDelivery,
} from "@/lib/delivery";

// ─────────────────────────────────────────────────────────────────────────
// SCORE DE CALIDAD POR LOCAL
//
// Un número por local y por mes, armado con los cuatro indicadores del
// tablero. La definición es del cliente y vive en
// `../../TABLA_SCORE_MARCAS.md`; los pesos, en `marca.ts`.
//
// Tres reglas que no son detalles de implementación:
//
// 1. CADA MARCA TIENE SU MODELO. Censurado mide cuatro ejes; Formaggio dos,
//    porque no tiene auditoría presencial ni vende por apps. Eso no es un
//    dato faltante: es que el eje no le corresponde, y en el informe la
//    sección directamente no aparece.
//
// 2. UN EJE SIN DATO NO VALE CERO. Su peso se reparte entre los ejes que sí
//    tienen dato. Un local sin auditoría este mes saca el promedio de lo que
//    sí se midió, no un 30% de castigo por algo que nadie fue a medir.
//
// 3. EL SCORE ES DEL LOCAL, NO DE LA COCINA. Las marcas B —Lomos la
//    Catedral, Burger Club, Woops— cocinan adentro y se venden aparte: sus
//    números van en su propia sección del informe y no entran acá.
// ─────────────────────────────────────────────────────────────────────────

export type Eje = {
  clave: EjeScore;
  nombre: string;
  peso: number;
  /** 0–100, o null si este mes no hay dato. */
  valor: number | null;
  /** De dónde salió, para poder decirlo en el informe. */
  detalle: string;
};

export type Score = {
  /** 0–100. Null si ningún eje del modelo tiene dato. */
  valor: number | null;
  ejes: Eje[];
  /** Los ejes del modelo de esta marca que este mes no tienen dato. */
  sinDato: Eje[];
};

const NOMBRES: Record<EjeScore, string> = {
  auditoria: "Auditoría",
  mystery: "Mystery shopper",
  puntuaciones: "Puntuaciones",
  operativo: "Operativo",
};

/**
 * Las tiendas de un local agrupadas por app.
 *
 * Un local puede tener más de un punto de venta en la misma app —la tienda
 * normal y la Turbo de Rappi—, y para el score esa app tiene que valer una
 * sola vez: si no, Rappi pesaría el doble que Google. Se promedia adentro del
 * canal y recién ese número entra al promedio general. Decidido con Daniela el
 * 09/09/2026.
 */
function porCanal(filas: FilaPunto[]): Map<string, FilaPunto[]> {
  const mapa = new Map<string, FilaPunto[]>();
  for (const f of filas) {
    const lista = mapa.get(f.punto.channel) ?? [];
    lista.push(f);
    mapa.set(f.punto.channel, lista);
  }
  return mapa;
}

/** El promedio de una lista, o null si está vacía. */
function promedio(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, v) => a + v, 0) / valores.length : null;
}

/** Cómo se nombra un canal en el detalle, diciendo si son varias tiendas. */
function etiquetaCanal(canal: string, tiendas: number): string {
  return tiendas > 1 ? `${canal} (${tiendas} tiendas)` : canal;
}

/** Una calificación de 1 a 5 llevada a escala 100. */
const aEscala100 = (estrellas: number) => (estrellas / 5) * 100;

/** Los minutos cerrado de un mes, como porcentaje de ese mes. */
function pctDelMes(minutos: number, mes: string): number {
  const [anio, m] = mes.split("-").map(Number);
  const dias = new Date(anio, m, 0).getDate();
  return (minutos / (dias * 24 * 60)) * 100;
}

/**
 * El eje operativo de UN punto de venta.
 *
 * `100 − cancelados − tiempo cerrado`, con los dos en porcentaje. Qué
 * indicador de cada app es cuál lo dice el catálogo (columna `rol`), no una
 * lista acá: las tres apps los nombran distinto y ninguna usa la palabra
 * "rechazados" de la definición.
 *
 * Dos traducciones que hace esta función:
 *
 * - **Rappi y Uber publican disponibilidad, no tiempo cerrado.** Es el
 *   concepto invertido: el tiempo cerrado es `100 − disponibilidad`.
 * - **Uber no publica un porcentaje de cancelados**, publica cuántos pedidos
 *   completó y cuántos no. El porcentaje sale de esos dos.
 *
 * Un punto que no trae ninguno de los dos componentes devuelve null: no hay
 * dato, y un eje sin dato no vale cero.
 */
function operativoDe(fila: FilaPunto, defs: IndicadorDef[], mes: string): number | null {
  const porRol = (rol: string) => defs.find((d) => d.rol === rol && d.channel === fila.punto.channel);
  const leer = (rol: string) => {
    const def = porRol(rol);
    return def ? valorDe(fila, def.clave) : null;
  };

  let cancelados = leer("cancelados");
  if (cancelados === null) {
    const completados = leer("pedidos_completados");
    const noCompletados = leer("pedidos_no_completados");
    const total = (completados ?? 0) + (noCompletados ?? 0);
    cancelados = total > 0 ? ((noCompletados ?? 0) / total) * 100 : null;
  }

  let cerrado: number | null = null;
  const minutos = leer("tiempo_cerrado");
  if (minutos !== null) cerrado = pctDelMes(minutos, mes);
  else {
    const disponibilidad = leer("disponibilidad");
    if (disponibilidad !== null) cerrado = 100 - disponibilidad;
  }

  if (cancelados === null && cerrado === null) return null;
  // Piso en cero: un local con 40% cancelado y 70% cerrado no tiene un score
  // negativo, tiene un cero.
  return Math.max(0, 100 - (cancelados ?? 0) - (cerrado ?? 0));
}

export type DatosScore = {
  mes: string;
  marcaSlug: string;
  locationId: string;
  visitas: VisitaFila[];
  auditorias: AuditoriaFila[];
  snapshot: SnapshotFila | undefined;
  puntos: PuntoDeVenta[];
  valores: ValorDelivery[];
  defs: IndicadorDef[];
};

/**
 * El score de un local en un mes.
 *
 * Recibe los datos ya cargados —la pantalla los pide una vez para todos los
 * locales— y no consulta nada por su cuenta.
 */
export function calcularScore(d: DatosScore): Score {
  const pesos = PESOS_SCORE[d.marcaSlug as keyof typeof PESOS_SCORE] ?? PESOS_SCORE.censurado;
  const ejes: Eje[] = [];

  const arma = (clave: EjeScore, valor: number | null, detalle: string) => {
    const peso = pesos[clave];
    // Un eje con peso cero no es parte del modelo de esta marca: no se
    // muestra ni como «sin dato». Formaggio no tiene auditoría porque no se
    // audita, no porque falte cargarla.
    if (!peso) return;
    ejes.push({ clave, nombre: NOMBRES[clave], peso, valor, detalle });
  };

  // ── Mystery shopper ────────────────────────────────────────────────────
  // Las dos experiencias del formulario entran juntas acá: el eje mide la
  // visita del mes, sin importar si fue al salón o por delivery. Las
  // marcadas para revisar quedan afuera, como en toda la app.
  const visitas = d.visitas.filter(
    (v) =>
      v.location_id === d.locationId &&
      !v.needs_review &&
      v.score_pct !== null &&
      (v.visit_date ?? "").slice(0, 7) === d.mes,
  );
  arma(
    "mystery",
    visitas.length ? visitas.reduce((a, v) => a + (v.score_pct ?? 0), 0) / visitas.length : null,
    visitas.length ? `${visitas.length} visita${visitas.length === 1 ? "" : "s"}` : "sin visita este mes",
  );

  // ── Auditoría ──────────────────────────────────────────────────────────
  // La más reciente del mes: si auditaron dos veces, vale la última.
  const auditoria = d.auditorias
    .filter((a) => a.location_id === d.locationId && a.audit_date.slice(0, 7) === d.mes)
    .sort((a, b) => b.audit_date.localeCompare(a.audit_date))[0];
  arma(
    "auditoria",
    auditoria?.score_pct ?? null,
    auditoria ? `auditoría del ${auditoria.audit_date.slice(8, 10)}/${auditoria.audit_date.slice(5, 7)}` : "sin auditoría este mes",
  );

  // ── Los puntos de venta propios del local ──────────────────────────────
  // Sin marcas B: el score es del local, no de las cocinas que alquila.
  const propios = d.puntos.filter((p) => p.location_id === d.locationId && !p.marcaB && p.activo);
  const idsPropios = new Set(propios.map((p) => p.id));
  const filas = armarFilas(
    delMes(
      d.valores.filter((v) => idsPropios.has(v.delivery_point_id)),
      d.mes,
    ),
    d.defs,
    propios,
  );

  // ── Puntuaciones ───────────────────────────────────────────────────────
  // Google y las apps, cada calificación llevada a escala 100 y promediadas
  // sin ponderar. Cada app vale una vez, aunque el local tenga dos tiendas en
  // ella. Uber queda afuera por definición del cliente.
  const calificaciones: { fuente: string; valor: number }[] = [];
  if (d.snapshot?.total_score) {
    calificaciones.push({ fuente: "Google", valor: aEscala100(d.snapshot.total_score) });
  }
  for (const [canal, delCanal] of porCanal(filas)) {
    if (canal === "uber") continue;
    const def = d.defs.find((x) => x.rol === "calificacion" && x.channel === canal);
    const estrellas = def
      ? promedio(delCanal.map((f) => valorDe(f, def.clave)).filter((v): v is number => v !== null))
      : null;
    if (estrellas !== null) {
      calificaciones.push({
        fuente: etiquetaCanal(canal, delCanal.length),
        valor: aEscala100(estrellas),
      });
    }
  }
  arma(
    "puntuaciones",
    promedio(calificaciones.map((c) => c.valor)),
    calificaciones.length ? calificaciones.map((c) => c.fuente).join(" · ") : "sin calificaciones",
  );

  // ── Operativo ──────────────────────────────────────────────────────────
  // Promedio simple de los canales por los que el local vende, con las
  // tiendas del mismo canal promediadas antes. Un canal sin dato no baja el
  // promedio: no está.
  const operativos = [...porCanal(filas)]
    .map(([canal, delCanal]) => ({
      canal: etiquetaCanal(canal, delCanal.length),
      valor: promedio(
        delCanal
          .map((f) => operativoDe(f, d.defs, d.mes))
          .filter((v): v is number => v !== null),
      ),
    }))
    .filter((x): x is { canal: string; valor: number } => x.valor !== null);
  arma(
    "operativo",
    promedio(operativos.map((o) => o.valor)),
    operativos.length ? operativos.map((o) => o.canal).join(" · ") : "sin datos de apps",
  );

  // ── El total, redistribuyendo el peso de lo que falta ──────────────────
  const conDato = ejes.filter((e) => e.valor !== null);
  const pesoPresente = conDato.reduce((a, e) => a + e.peso, 0);
  return {
    valor: pesoPresente
      ? conDato.reduce((a, e) => a + (e.valor as number) * e.peso, 0) / pesoPresente
      : null,
    ejes,
    sinDato: ejes.filter((e) => e.valor === null),
  };
}
