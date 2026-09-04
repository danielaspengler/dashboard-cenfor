import { aFechaISO, aNumero, columna, mapaDeColumnas, type ResultadoSync } from "./comunes";

// FUENTE: planilla "Google_Maps_CENFOR", dos hojas.
//   `resenas`         → una fila por reseña nueva
//   `Rating_Snapshot` → el acumulado histórico de cada local, que la
//                       planilla PISA en cada corrida del scraper
//
// El matcheo del local se hace SIEMPRE por placeId, nunca por el nombre:
// el título de la ficha cambia cuando el cliente lo edita en Google Maps,
// el placeId no. Un placeId desconocido no se adivina: se descarta y se
// reporta, para que aparezca un local nuevo en vez de ensuciar otro.

export type ResenaCruda = {
  google_review_id: string;
  place_id: string;
  author: string | null;
  review_date: string | null;
  rating: number | null;
  text: string | null;
};

export type SnapshotCrudo = {
  place_id: string;
  scraped_on: string;
  scraped_at: string | null;
  reviews_count: number | null;
  total_score: number | null;
};

export function parseResenas(valores: string[][]): ResultadoSync<ResenaCruda> {
  const filas: ResenaCruda[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];
  if (valores.length < 2) return { filas, descartadas };

  const mapa = mapaDeColumnas(valores[0]);
  const cAutor = columna(mapa, "autor");
  const cFecha = columna(mapa, "fecha");
  const cPlace = columna(mapa, "placeId");
  const cRating = columna(mapa, "rating");
  const cReview = columna(mapa, "reviewId");
  const cTexto = columna(mapa, "texto");

  if (cPlace === null || cReview === null) {
    throw new Error(
      "La hoja `resenas` no tiene las columnas placeId y reviewId. " +
        "Cambió la estructura de la fuente: revisar antes de sincronizar.",
    );
  }

  const vistos = new Set<string>();

  for (const fila of valores.slice(1)) {
    const reviewId = String(fila[cReview] ?? "").trim();
    const placeId = String(fila[cPlace] ?? "").trim();

    if (!reviewId || !placeId) {
      descartadas.push({ motivo: "sin reviewId o placeId", detalle: (fila[0] ?? "").toString() });
      continue;
    }
    // La misma reseña puede venir dos veces si el scraper se solapa.
    if (vistos.has(reviewId)) continue;
    vistos.add(reviewId);

    const rating = cRating !== null ? aNumero(fila[cRating]) : null;
    // Google puntúa de 1 a 5. Fuera de rango es dato roto, no una reseña mala.
    if (rating !== null && (rating < 1 || rating > 5)) {
      descartadas.push({ motivo: `rating fuera de rango (${rating})`, detalle: reviewId });
      continue;
    }

    filas.push({
      google_review_id: reviewId,
      place_id: placeId,
      author: cAutor !== null ? String(fila[cAutor] ?? "").trim() || null : null,
      review_date: cFecha !== null ? aFechaISO(fila[cFecha]) : null,
      rating,
      // Las reseñas sin texto son normales: mucha gente puntúa y no escribe.
      text: cTexto !== null ? String(fila[cTexto] ?? "").trim() || null : null,
    });
  }

  return { filas, descartadas };
}

export function parseSnapshot(valores: string[][]): ResultadoSync<SnapshotCrudo> {
  const filas: SnapshotCrudo[] = [];
  const descartadas: { motivo: string; detalle: string }[] = [];
  if (valores.length < 2) return { filas, descartadas };

  const mapa = mapaDeColumnas(valores[0]);
  const cPlace = columna(mapa, "placeId");
  const cCount = columna(mapa, "reviewsCount");
  const cScore = columna(mapa, "totalScore");
  const cScraped = columna(mapa, "scrapedAt");
  const cTitle = columna(mapa, "title");

  if (cPlace === null) {
    throw new Error("La hoja `Rating_Snapshot` no tiene columna placeId.");
  }

  for (const fila of valores.slice(1)) {
    const placeId = String(fila[cPlace] ?? "").trim();
    if (!placeId) continue;

    const scrapedRaw = cScraped !== null ? String(fila[cScraped] ?? "").trim() : "";
    // La fecha del scrapeo es la que ordena la serie histórica. Si falta,
    // se usa hoy: perder la foto sería peor que datarla con un día de error.
    const scrapedOn = aFechaISO(scrapedRaw) ?? new Date().toISOString().slice(0, 10);

    filas.push({
      place_id: placeId,
      scraped_on: scrapedOn,
      scraped_at: scrapedRaw || null,
      reviews_count: cCount !== null ? aNumero(fila[cCount]) : null,
      total_score: cScore !== null ? aNumero(fila[cScore]) : null,
    });

    if (cTitle !== null && !String(fila[cTitle] ?? "").trim()) {
      descartadas.push({ motivo: "ficha sin título", detalle: placeId });
    }
  }

  return { filas, descartadas };
}
