// Relevamiento de una planilla de mystery shopper. No escribe nada.
//
//   npx tsx scripts/relevar-mystery.ts [censurado|formaggio] [pestaña] [filas]
//
// El sync lee hoy solo la hoja "Puntajes por Visita", que trae los puntajes
// con nombres crudos ([TA] %Sec3). Los nombres de verdad de cada sección y los
// comentarios de la visita viven en las otras dos hojas.

import { fetchSheetValues } from "../src/lib/google/sheets.ts";
import { PLANILLAS } from "../src/lib/sync/fuentes.ts";

process.loadEnvFile(".env.local");

const marca = process.argv[2] === "formaggio" ? "msFormaggio" : "msCensurado";
const pestaña = process.argv[3] ?? "Configuración de Puntaje";
const filas = Number(process.argv[4] ?? 40);

async function main() {
  const valores = await fetchSheetValues(PLANILLAS[marca], `'${pestaña}'!A1:J${filas}`);
  console.log(`${marca} · ${pestaña} · ${valores.length} filas\n`);
  for (let i = 0; i < valores.length; i++) {
    const celdas = (valores[i] ?? [])
      .map((c) => String(c ?? "").trim().slice(0, 60))
      .filter(Boolean);
    if (celdas.length) console.log(String(i + 1).padStart(3), celdas.join("  |  "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
