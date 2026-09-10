import {
  aFechaISO,
  aPorcentaje,
  aTimestampISO,
  aNumero,
  columna,
  mapaDeColumnas,
  normalizar,
  type ResultadoSync,
} from "./comunes";

// FUENTE: hoja "Puntajes por Visita" de cada planilla de mystery shopper.
//
// Decisión de diseño clave: el puntaje NO se recalcula acá. La planilla ya
// lo calcula, y sus pesos son editables por el cliente desde la hoja
// "Configuración de Puntaje". Si el dashboard reimplementara el scoring,
// cada cambio de criterio del cliente exigiría tocar código y las dos
// versiones se irían separando en silencio. Leemos el resultado.
//
// Las dos marcas tienen planillas distintas:
//   Formaggio → solo take away, 4 secciones
//   Censurado → take away Y delivery, con dos bloques de columnas; el
//               campo "Tipo experiencia" dice cuál está completo.

export type VisitaCruda = {
  ms_form_label: string;
  form_timestamp: string | null;
  visit_date: string | null;
  evaluator: string | null;
  experience_type: "take_away" | "delivery";
  score_pct: number | null;
  points_obtained: number | null;
  points_max: number | null;
  classification: string | null;
  sections: Record<string, number | null>;
  needs_review: boolean;
  source_row_hash: string;
};

/** Lo que el mystery shopper escribió con sus palabras. */
export type ComentariosVisita = {
  observaciones: string | null;
  lo_mejor: string | null;
  a_mejorar: string | null;
};

/**
 * Los comentarios de cada visita, desde la hoja de RESPUESTAS del formulario.
 *
 * La hoja que el sync lee para los puntajes no los tiene: los calcula la
 * planilla y ahí solo hay números. El texto —lo único del informe escrito por
 * alguien que estuvo en el local— vive en las respuestas crudas.
 *
 * Se indexan por marca temporal, que es la misma llave con la que se deduplica
 * cada visita.
 *
 * **Censurado tiene las tres columnas dos veces**, una por bloque: su
 * formulario se ramifica en take away y delivery, y la persona completa uno
 * solo. Por eso no se busca "la" columna sino todas las que coinciden, y gana
 * la primera con texto. Formaggio tiene una sola de cada una y cae en el mismo
 * camino sin ningún caso especial.
 */
export function parseComentarios(valores: string[][]): Map<string, ComentariosVisita> {
  const porTimestamp = new Map<string, ComentariosVisita>();
  const encabezados = valores[0] ?? [];
  if (!encabezados.length) return porTimestamp;

  const columnasQue = (test: (h: string) => boolean) =>
    encabezados.map((h, i) => (test(normalizar(String(h ?? ""))) ? i : -1)).filter((i) => i >= 0);

  const cTimestamp = columnasQue((h) => h === "marca temporal")[0];
  if (cTimestamp === undefined) return porTimestamp;

  // Se buscan por lo que dicen, no por su posición: las dos planillas escriben
  // estas preguntas distinto ("Escriba lo mejor de su de experiencia
  // comprando" contra "¿Qué fue lo mejor de su experiencia de compra?").
  const cObservaciones = columnasQue((h) => h.startsWith("observaciones del pedido"));
  const cLoMejor = columnasQue((h) => h.includes("lo mejor de su"));
  const cAMejorar = columnasQue((h) => h.includes("cambiaria") || h.includes("cambiarias"));

  const primeroConTexto = (fila: string[], indices: number[]): string | null => {
    for (const i of indices) {
      const texto = String(fila[i] ?? "").trim();
      if (texto) return texto;
    }
    return null;
  };

  for (let n = 1; n < valores.length; n++) {
    const fila = valores[n] ?? [];
    const timestamp = aTimestampISO(fila[cTimestamp]);
    if (!timestamp) continue;
    porTimestamp.set(timestamp, {
      observaciones: primeroConTexto(fila, cObservaciones),
      lo_mejor: primeroConTexto(fila, cLoMejor),
      a_mejorar: primeroConTexto(fila, cAMejorar),
    });
  }
  return porTimestamp;
}

/** Clasificación tal como la define la planilla: >=90 / >=75 / >=60 / resto. */
export function clasificar(scorePct: number): string {
  if (scorePct >= 90) return "Excelente";
  if (scorePct >= 75) return "Bueno";
  if (scorePct >= 60) return "Regular";
  return "Deficiente";
}

// Evaluadores que no son visitas reales: cargas de prueba del formulario.
const EVALUADORES_DE_PRUEBA = ["prueba", "test", "testing"];

/**
 * Cómo se llama cada sección, según la hoja «Configuración de Puntaje».
 *
 * La hoja de puntajes titula sus columnas «[TA] %Sec3», que en un informe que
 * se le entrega a un local no dice nada. El nombre de verdad está en la hoja
 * de configuración: «TA · Sec.3 Asesoramiento» en Censurado, y «Sec.4
 * Experiencia en el local» en Formaggio, que no tiene bloques.
 *
 * Se leen de la planilla en vez de escribirlos acá porque son del cliente: el
 * día que renombre una sección, el informe la sigue.
 *
 * Devuelve un mapa de la forma { "TA·SEC3": "Asesoramiento" }.
 */
export function parseNombresDeSeccion(valores: string[][]): Map<string, string> {
  const nombres = new Map<string, string>();
  for (const fila of valores ?? []) {
    for (const celda of fila ?? []) {
      const m = String(celda ?? "")
        .trim()
        .match(/^(?:(TA|DE)\s*·\s*)?Sec\.?\s*(\d+)\s+(.+)$/i);
      if (!m) continue;
      const clave = `${(m[1] ?? "").toUpperCase()}·SEC${m[2]}`;
      if (!nombres.has(clave)) nombres.set(clave, m[3].trim());
    }
  }
  return nombres;
}

/** La misma llave, calculada desde el encabezado de la hoja de puntajes. */
function claveDeEncabezado(encabezado: string): string | null {
  const m = String(encabezado).match(/^\s*(?:\[(TA|DE)\])?\s*%\s*Sec\.?\s*(\d+)/i);
  return m ? `${(m[1] ?? "").toUpperCase()}·SEC${m[2]}` : null;
}

type Opciones = {
  /** Prefijo del hash, para que Formaggio y Censurado no colisionen. */
  marca: "formaggio" | "censurado";
  /** Censurado parte sus columnas en bloques [TA] y [DE]. */
  conBloques: boolean;
  /** Nombres de sección leídos de la hoja de configuración de la planilla. */
  nombresDeSeccion?: Map<string, string>;
};

export function parseMysteryShopper(
  valores: string[][],
  opciones: Opciones,
): ResultadoSync<VisitaCruda> {
  const filas: VisitaCruda[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];

  // La fila 1 es el título de la hoja; los encabezados están en la 2.
  const iEncabezados = valores.findIndex(
    (f) => f.some((c) => normalizar(String(c ?? "")) === "puntaje final (%)"),
  );
  if (iEncabezados === -1) {
    throw new Error(
      "No se encontró la fila de encabezados con «Puntaje final (%)» en " +
        "«Puntajes por Visita». Cambió la estructura de la planilla.",
    );
  }

  const encabezados = valores[iEncabezados];
  const mapa = mapaDeColumnas(encabezados);

  const cTimestamp = columna(mapa, "Marca temporal");
  const cLocal = columna(mapa, "Local visitado", "Local");
  const cEvaluador = columna(mapa, "Mystery Shopper");
  const cFecha = columna(mapa, "Fecha visita");
  const cTipo = columna(mapa, "Tipo experiencia");
  const cObtenidos = columna(mapa, "Puntos obtenidos");
  const cMaximos = columna(mapa, "Puntos máximos");
  const cScore = columna(mapa, "Puntaje final (%)");
  const cClasificacion = columna(mapa, "Clasificación");
  const cRevisar = columna(mapa, "¿Revisar? (config sin coincidencia)", "¿Revisar?");

  if (cLocal === null || cScore === null) {
    throw new Error("Faltan las columnas «Local» o «Puntaje final (%)».");
  }

  // Los % por sección se toman por nombre de encabezado: cambian entre
  // marcas y entre bloques, así que se recogen todos los que empiecen con
  // "% Sec" o "%Sec".
  const columnasSeccion: { clave: string; indice: number }[] = [];
  encabezados.forEach((h, i) => {
    const t = normalizar(String(h ?? ""));
    if (!/^(\[ta\]|\[de\])?\s*%\s*sec/.test(t)) return;
    // Se guardan con el nombre que el cliente les puso en su hoja de
    // configuración —«Asesoramiento», «Calidad de producto»— y no con el
    // encabezado crudo «[TA] %Sec3», que en un informe no dice nada. Si esa
    // hoja no se pudo leer queda el crudo, que es lo que se guardó hasta el
    // 10/09/2026.
    const llave = claveDeEncabezado(String(h));
    const nombre = llave ? opciones.nombresDeSeccion?.get(llave) : undefined;
    columnasSeccion.push({ clave: nombre ?? String(h).trim(), indice: i });
  });

  for (let n = iEncabezados + 1; n < valores.length; n++) {
    const fila = valores[n];
    const etiquetaLocal = String(fila?.[cLocal] ?? "").trim();
    if (!etiquetaLocal) continue; // fila vacía: la planilla arrastra fórmulas hasta la 1000

    const evaluador = cEvaluador !== null ? String(fila[cEvaluador] ?? "").trim() : "";
    if (EVALUADORES_DE_PRUEBA.includes(normalizar(evaluador))) {
      descartadas.push({ motivo: "carga de prueba", detalle: `${etiquetaLocal} · ${evaluador}` });
      continue;
    }

    const scorePct = aPorcentaje(fila[cScore]);
    if (scorePct === null) {
      descartadas.push({ motivo: "sin puntaje final", detalle: `${etiquetaLocal} · fila ${n + 1}` });
      continue;
    }

    // "⚠ Revisar Config": el motor de la planilla no encontró una respuesta
    // en su tabla de puntajes, así que ese puntaje está mal calculado. Se
    // guarda igual —para que se vea que la visita existió— pero marcado,
    // y los promedios del dashboard lo excluyen.
    const textoRevisar = cRevisar !== null ? String(fila[cRevisar] ?? "").trim() : "";
    const needsReview = textoRevisar !== "" && normalizar(textoRevisar) !== "ok";

    const tipoTexto = cTipo !== null ? normalizar(String(fila[cTipo] ?? "")) : "";
    const experienceType: "take_away" | "delivery" =
      opciones.conBloques && tipoTexto.includes("delivery") ? "delivery" : "take_away";

    const timestamp = cTimestamp !== null ? aTimestampISO(fila[cTimestamp]) : null;
    const visitDate =
      (cFecha !== null ? aFechaISO(fila[cFecha]) : null) ??
      (timestamp ? timestamp.slice(0, 10) : null);

    const sections: Record<string, number | null> = {};
    for (const { clave, indice } of columnasSeccion) {
      const v = aPorcentaje(fila[indice]);
      if (v !== null) sections[clave] = v;
    }

    // Huella para no duplicar. La marca temporal del formulario es única
    // por respuesta; se le suman marca y local por si dos formularios
    // llegaran con el mismo instante.
    const hash = [
      opciones.marca,
      normalizar(etiquetaLocal),
      timestamp ?? `fila-${n + 1}`,
      experienceType,
    ].join("|");

    filas.push({
      ms_form_label: etiquetaLocal,
      form_timestamp: timestamp,
      visit_date: visitDate,
      evaluator: evaluador || null,
      experience_type: experienceType,
      score_pct: scorePct,
      points_obtained: cObtenidos !== null ? aNumero(fila[cObtenidos]) : null,
      points_max: cMaximos !== null ? aNumero(fila[cMaximos]) : null,
      classification:
        (cClasificacion !== null ? String(fila[cClasificacion] ?? "").trim() : "") ||
        clasificar(scorePct),
      sections,
      needs_review: needsReview,
      source_row_hash: hash,
    });
  }

  return { filas, descartadas };
}
