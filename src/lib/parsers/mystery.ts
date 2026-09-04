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

/** Clasificación tal como la define la planilla: >=90 / >=75 / >=60 / resto. */
export function clasificar(scorePct: number): string {
  if (scorePct >= 90) return "Excelente";
  if (scorePct >= 75) return "Bueno";
  if (scorePct >= 60) return "Regular";
  return "Deficiente";
}

// Evaluadores que no son visitas reales: cargas de prueba del formulario.
const EVALUADORES_DE_PRUEBA = ["prueba", "test", "testing"];

type Opciones = {
  /** Prefijo del hash, para que Formaggio y Censurado no colisionen. */
  marca: "formaggio" | "censurado";
  /** Censurado parte sus columnas en bloques [TA] y [DE]. */
  conBloques: boolean;
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
  // "% Sec" o "%Sec" y se guardan tal cual vienen.
  const columnasSeccion: { clave: string; indice: number }[] = [];
  encabezados.forEach((h, i) => {
    const t = normalizar(String(h ?? ""));
    if (/^(\[ta\]|\[de\])?\s*%\s*sec/.test(t)) {
      columnasSeccion.push({ clave: String(h).trim(), indice: i });
    }
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
