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

// Semáforo de las AUDITORÍAS presenciales. Son otros cortes y son cinco, no
// cuatro: la planilla los define en su bloque «LECTURA DE LOS RESULTADOS»,
// encontrado el 09/09/2026 al relevar para el informe por local. Hasta
// entonces las auditorías se pintaban con los cortes de mystery shopper,
// que son del formulario y no de la auditoría.
export const NIVELES_AUDITORIA = [
  { desde: 95, nombre: "Se cumple totalmente", color: "#15803d" },
  { desde: 90, nombre: "Se cumple mayoritariamente", color: "#65a30d" },
  { desde: 70, nombre: "Se cumple en buena parte", color: "#ca8a04" },
  { desde: 50, nombre: "Se cumple en partes", color: "#d97706" },
  { desde: 0, nombre: "No se cumple", color: "#b91c1c" },
] as const;

export function nivelAuditoria(porcentaje: number | null | undefined) {
  if (porcentaje === null || porcentaje === undefined) return null;
  return (
    NIVELES_AUDITORIA.find((n) => porcentaje >= n.desde) ??
    NIVELES_AUDITORIA[NIVELES_AUDITORIA.length - 1]
  );
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
