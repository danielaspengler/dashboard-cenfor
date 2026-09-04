// La marca vive en UN solo archivo. Cliente nuevo = otra config, no una
// cacería de textos por el código. Es la regla de marca blanca del kit.
//
// PROVISORIO: paleta neutra hasta que llegue la identidad de CENFOR (logo,
// colores y tipografías). Cambiar acá y se propaga a toda la app.

export const MARCA = {
  nombre: "CENFOR",
  bajada: "Control operativo",
  // Las dos marcas del grupo. El color distingue una de otra en gráficos y
  // filtros; no pretende ser la identidad de cada marca.
  marcas: {
    censurado: { nombre: "Censurado", color: "#b45309" },
    formaggio: { nombre: "Formaggio", color: "#1d4ed8" },
  },
} as const;

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
