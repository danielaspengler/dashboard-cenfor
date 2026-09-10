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

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letra = (i: number) =>
  i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26];

async function main() {
  const valores = await fetchSheetValues(PLANILLAS[marca], `'${pestaña}'!A1:CZ${filas}`);
  console.log(`${marca} · ${pestaña} · ${valores.length} filas\n`);

  // Con "--columnas" se lista el encabezado de cada columna con su letra, que
  // es lo que hace falta para escribir un parser; sin eso, el volcado plano.
  if (process.argv.includes("--columnas")) {
    const encabezados = valores[0] ?? [];
    encabezados.forEach((h, i) => {
      const texto = String(h ?? "").trim();
      if (texto) console.log(`${letra(i).padEnd(3)} ${texto.slice(0, 90)}`);
    });
    return;
  }

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
