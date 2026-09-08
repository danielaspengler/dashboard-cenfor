// Relevamiento de la planilla de delivery de Rappi. No escribe nada:
// lista las pestañas y vuelca las primeras filas de cada una para poder
// leer su estructura antes de escribir el parser.
//
//   npx tsx scripts/relevar-delivery.ts

import { readFileSync } from "node:fs";
import { fetchSheetValues, fetchSheetTitles } from "../src/lib/google/sheets.ts";

const CLAVE = JSON.parse(
  readFileSync(
    "C:/Users/Daniela Spengler/Desktop/Claude/HOLT/CENFOR/_credenciales/cenfor-service-account.json",
    "utf8",
  ),
);
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = CLAVE.client_email;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = CLAVE.private_key;

const ID = "1axROvefosXxlhCiCqK9iTj4ulPaOvM-gMxYw2jirzjU";
const FILAS = Number(process.argv[2] ?? 8);

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letra = (i: number) =>
  i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26];

async function main() {
  const titulos = await fetchSheetTitles(ID);
  console.log(`PESTAÑAS (${titulos.length}): ${titulos.join(" | ")}\n`);

  for (const t of titulos) {
    console.log("=".repeat(70));
    console.log(`PESTAÑA: ${t}`);
    console.log("=".repeat(70));
    const filas = await fetchSheetValues(ID, `${t}!A1:AZ${FILAS}`);
    if (filas.length === 0) {
      console.log("  (vacía)\n");
      continue;
    }
    const ancho = Math.max(...filas.map((f) => f.length));
    for (let c = 0; c < ancho; c++) {
      const col = filas.map((f) => (f[c] ?? "").toString().slice(0, 28));
      if (col.every((v) => v === "")) continue;
      console.log(`  ${letra(c).padEnd(3)} | ${col.join("  ·  ")}`);
    }
    console.log();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
