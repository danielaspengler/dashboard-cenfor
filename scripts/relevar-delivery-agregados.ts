// Segundo paso del relevamiento de Rappi: cuántas filas hay, qué marcas y
// puntos de venta aparecen, y qué períodos cubre cada pestaña.
//
//   npx tsx scripts/relevar-delivery-agregados.ts

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

/** Serial de Sheets a fecha ISO. Base 1899-12-30, igual que el parser del sync. */
function fecha(serial: unknown): string {
  const n = Number(serial);
  if (!Number.isFinite(n) || n === 0) return String(serial ?? "");
  return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}

async function main() {
  for (const t of await fetchSheetTitles(ID)) {
    const filas = await fetchSheetValues(ID, `${t}!A1:AZ5000`);
    const enc = (filas[0] ?? []).map(String);
    const datos = filas.slice(1).filter((f) => f.some((v) => String(v ?? "") !== ""));

    console.log("=".repeat(70));
    console.log(`${t} — ${datos.length} filas de datos`);
    console.log("=".repeat(70));

    const col = (nombre: string) => enc.findIndex((e) => e.trim() === nombre);
    const valores = (i: number) =>
      [...new Set(datos.map((f) => String(f[i] ?? "").trim()).filter(Boolean))].sort();

    for (const nombre of ["Marca", "Punto de venta", "Motivo", "Estado"]) {
      const i = col(nombre);
      if (i === -1) continue;
      const v = valores(i);
      console.log(`  ${nombre} (${v.length}): ${v.join(" · ")}`);
    }

    for (const nombre of ["Período inicio", "Período fin"]) {
      const i = col(nombre);
      if (i === -1) continue;
      const v = valores(i).map(fecha);
      console.log(`  ${nombre} (${v.length}): ${v.join(" · ")}`);
    }

    // Combinaciones marca+punto+período: dice si la clave natural es única.
    const iM = col("Marca");
    const iP = col("Punto de venta");
    const iI = col("Período inicio");
    if (iM !== -1 && iP !== -1 && iI !== -1) {
      const claves = datos.map((f) => `${f[iM]}|${f[iP]}|${f[iI]}`);
      const unicas = new Set(claves);
      console.log(
        `  clave punto+período: ${unicas.size} únicas sobre ${claves.length} filas` +
          (unicas.size === claves.length ? "  → única" : "  → SE REPITE"),
      );
    }
    console.log();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
