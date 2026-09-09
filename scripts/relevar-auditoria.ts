// Relevamiento de UNA pestaña de la planilla de auditorías. No escribe nada.
//
// El parser de auditorías lee hoy cinco celdas sueltas (local, fecha, auditor,
// franquiciado, puntaje final). El informe por local necesita además las
// categorías —Formalidades, Fachada y vidriera, Cocina…— y el texto de las
// recomendaciones de la auditora, y las dos cosas están en esta misma pestaña,
// en celdas que hay que ubicar antes de escribir nada.
//
//   npx tsx scripts/relevar-auditoria.ts "Carlos Paz" [filas]
//   npx tsx scripts/relevar-auditoria.ts --pestanas
//
// Volcado con la referencia de celda al lado (D3, O4, Z6…), porque esta
// planilla es un formulario con celdas combinadas: acá las posiciones son
// fijas y son la única llave que tiene el parser.

import { fetchSheetValues, fetchSheetTitles } from "../src/lib/google/sheets.ts";
import { PLANILLAS } from "../src/lib/sync/fuentes.ts";

process.loadEnvFile(".env.local");

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letra = (i: number) =>
  i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26];

async function main() {
  const titulos = await fetchSheetTitles(PLANILLAS.auditorias);

  if (process.argv[2] === "--pestanas" || !process.argv[2]) {
    console.log(`PESTAÑAS (${titulos.length}):\n  ${titulos.join("\n  ")}`);
    return;
  }

  const buscada = process.argv[2].toLowerCase();
  const titulo = titulos.find((t) => t.toLowerCase().includes(buscada));
  if (!titulo) {
    console.error(`No hay pestaña que contenga «${process.argv[2]}». Están: ${titulos.join(" | ")}`);
    process.exit(1);
  }

  const filas = Number(process.argv[3] ?? 80);
  const valores = await fetchSheetValues(PLANILLAS.auditorias, `'${titulo}'!A1:AZ${filas}`);
  console.log(`PESTAÑA: ${titulo} · ${valores.length} filas con contenido\n`);

  for (let f = 0; f < valores.length; f++) {
    const fila = valores[f] ?? [];
    for (let c = 0; c < fila.length; c++) {
      const v = String(fila[c] ?? "").trim();
      if (!v) continue;
      console.log(`${(letra(c) + (f + 1)).padEnd(6)} ${v.slice(0, 110)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
