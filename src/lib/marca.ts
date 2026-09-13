// La marca vive en UN solo archivo. Cliente nuevo = otra config, no una
// cacería de textos por el código. Es la regla de marca blanca del kit.
//
// PROVISORIO: paleta neutra hasta que llegue la identidad de CENFOR (logo,
// colores y tipografías). Cambiar acá y se propaga a toda la app.

export const MARCA = {
  nombre: "CENFOR",
  bajada: "Control operativo",
  // Las dos marcas del grupo. Amarillo y rojo, elegidos por Daniela el
  // 09/09/2026. Los tonos son los oscuros de cada color y no los plenos:
  // el punto se dibuja sobre blanco y un amarillo pleno no se ve.
  //
  // Formaggio va en VINO y no en rojo pleno: el rojo del semáforo
  // ("Deficiente", NIVELES) vive en las mismas tablas y dos rojos parecidos se
  // leen como la misma señal. El de la marca aparece solo como punto a la
  // izquierda del local.
  marcas: {
    censurado: { nombre: "Censurado", color: "#eab308" },
    formaggio: { nombre: "Formaggio", color: "#7f1d3a" },
  },
} as const;

// PESOS DEL SCORE DE CALIDAD
//
// Definición del cliente, en ../../TABLA_SCORE_MARCAS.md (09/09/2026). Van
// acá y no en la base porque son la definición del indicador, no un dato: si
// cambian, el número de todos los meses cambia y eso tiene que quedar en el
// historial de git.
//
// **Cada marca tiene su modelo, y un peso en cero significa que el eje NO le
// corresponde**, no que falte el dato. Formaggio no tiene auditoría presencial
// ni vende por apps: esas dos secciones no aparecen en su informe, sin aviso.
// Un eje que sí le corresponde pero este mes no se midió es otra cosa: ahí el
// peso se redistribuye y el informe lo dice.
export type EjeScore = "auditoria" | "mystery" | "puntuaciones" | "operativo";

export const PESOS_SCORE: Record<string, Record<EjeScore, number>> = {
  censurado: { auditoria: 30, mystery: 30, puntuaciones: 20, operativo: 20 },
  formaggio: { auditoria: 0, mystery: 50, puntuaciones: 50, operativo: 0 },
};

// Semáforo de mystery shopper y auditorías.
//
// Estos cuatro niveles NO son una elección de diseño: son los que la propia
// planilla de CENFOR usa para clasificar cada visita. El dashboard se adapta
// a su criterio, no al revés. Si el cliente cambia los cortes en la hoja
// "Configuración de Puntaje", hay que cambiarlos también acá.
export const NIVELES = [
  { desde: 90, nombre: "Excelente", color: "#15803d", clase: "text-green-700" },
  { desde: 75, nombre: "Bueno", color: "#65a30d", clase: "text-lime-700" },
  { desde: 60, nombre: "Regular", color: "#d97706", clase: "text-amber-600" },
  { desde: 0, nombre: "Deficiente", color: "#b91c1c", clase: "text-red-700" },
] as const;

// EL CORTE METODOLÓGICO DE LAS AUDITORÍAS
//
// En agosto de 2026 el cliente cambió la puntuación de su planilla de
// auditoría para que sea más exigente. El mystery shopper no se tocó. Un
// puntaje de antes y uno de después miden con varas distintas: ene 2025 –
// jul 2026 promedia 89,4% en 110 visitas y agosto 2026 da 77,0% en 6.
// Promediar los dos lados juntos inventa una caída de diez puntos que no pasó.
//
// **Todas las auditorías de agosto 2026 se hicieron con la planilla nueva y no
// hubo período de transición** (Daniela, 13/09/2026). Por eso la fecha alcanza
// para saber con qué vara se midió cada una, sin una columna nueva en `audits`
// ni una migración.
//
// Si el corte se mueve, se cambia esta línea y nada más: los avisos de las
// pantallas escriben el mes desde acá, no a mano.
export const CORTE_AUDITORIAS = "2026-08-01";

/** El mes del corte, para el gráfico y para los avisos de las pantallas. */
export const MES_CORTE = CORTE_AUDITORIAS.slice(0, 7);

export type EscalaAuditoria = "anterior" | "nueva" | "desconocida";

/**
 * Con qué planilla se midió una auditoría.
 *
 * Compara strings ISO, como el resto del proyecto: sin `Date` y sin husos
 * horarios. Una fecha vacía o ilegible devuelve "desconocida" y NO cae en un
 * lado por defecto: una auditoría sin escala no puede entrar a un promedio que
 * declara con qué vara se midió.
 */
export function escalaAuditoria(fecha: string | null | undefined): EscalaAuditoria {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return "desconocida";
  return fecha.slice(0, 10) >= CORTE_AUDITORIAS ? "nueva" : "anterior";
}

export type NivelAuditoria = { desde: number; nombre: string; color: string };

// Semáforo de las AUDITORÍAS presenciales hasta el corte. Son otros cortes y
// son cinco, no cuatro: la planilla los define en su bloque «LECTURA DE LOS
// RESULTADOS», encontrado el 09/09/2026 al relevar para el informe por local.
// Hasta entonces las auditorías se pintaban con los cortes de mystery shopper,
// que son del formulario y no de la auditoría.
export const NIVELES_AUDITORIA = [
  { desde: 95, nombre: "Se cumple totalmente", color: "#15803d" },
  { desde: 90, nombre: "Se cumple mayoritariamente", color: "#65a30d" },
  { desde: 70, nombre: "Se cumple en buena parte", color: "#ca8a04" },
  { desde: 50, nombre: "Se cumple en partes", color: "#d97706" },
  { desde: 0, nombre: "No se cumple", color: "#b91c1c" },
] as const;

// Semáforo de la planilla NUEVA, la que rige desde el corte. Un solo corte,
// 85: cumple o no cumple. Lo fija Daniela como criterio de HOLT para el
// tablero (13/09/2026) y por eso la pantalla lo afirma en vez de mostrarlo
// como provisorio. Son dos niveles y no los cinco de la planilla anterior.
export const NIVELES_AUDITORIA_NUEVA: readonly NivelAuditoria[] = [
  { desde: 85, nombre: "Cumple", color: "#15803d" },
  { desde: 0, nombre: "No cumple", color: "#b91c1c" },
];

/**
 * El nivel de un puntaje leído con una planilla dada.
 *
 * Existe aparte de `nivelAuditoria()` para el único caso en que el valor es un
 * PROMEDIO y no tiene una sola fecha: la tarjeta de auditorías del Resumen.
 */
export function nivelPorPlanilla(
  porcentaje: number | null | undefined,
  planilla: "anterior" | "nueva",
): NivelAuditoria | null {
  if (porcentaje === null || porcentaje === undefined) return null;
  const niveles: readonly NivelAuditoria[] =
    planilla === "nueva" ? NIVELES_AUDITORIA_NUEVA : NIVELES_AUDITORIA;
  return niveles.find((n) => porcentaje >= n.desde) ?? niveles[niveles.length - 1];
}

/**
 * El nivel de una auditoría, con los cortes de SU planilla.
 *
 * `fecha` decide la escala. Sin `fecha` se lee con la planilla anterior, que
 * es lo que hacían todos los llamados de antes del corte. Una fecha presente
 * pero ilegible es escala desconocida y no tiene nivel: el puntaje se muestra
 * sin color, en vez de pintarse con una vara que no le corresponde.
 */
export function nivelAuditoria(
  porcentaje: number | null | undefined,
  fecha?: string | null,
): NivelAuditoria | null {
  const escala = fecha === undefined ? "anterior" : escalaAuditoria(fecha);
  if (escala === "desconocida") return null;
  return nivelPorPlanilla(porcentaje, escala);
}

export function nivelDe(porcentaje: number | null | undefined) {
  if (porcentaje === null || porcentaje === undefined) return null;
  return NIVELES.find((n) => porcentaje >= n.desde) ?? NIVELES[NIVELES.length - 1];
}

// Reseñas de Google, escala 1–5. Umbral heredado del criterio de Papanato:
// CENFOR todavía no definió el suyo, así que se muestra pero se sabe que es
// prestado. Cuando lo defina, se cambia acá.
export const RESENAS = { max: 5, verde: 4.25, amarillo: 3.5 };

export function nivelResena(puntaje: number | null | undefined) {
  if (puntaje === null || puntaje === undefined) return null;
  if (puntaje >= RESENAS.verde) return NIVELES[0];
  if (puntaje >= RESENAS.amarillo) return NIVELES[2];
  return NIVELES[3];
}
