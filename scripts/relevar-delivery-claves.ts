// Tercer paso del relevamiento de Rappi: qué combinación de columnas
// identifica una fila sin repetirse. Es lo que después va a ser la
// restricción única de cada tabla, y con ella el dedup del sync.
//
//   npx tsx scripts/relevar-delivery-claves.ts

import { readFileSync } from "node:fs";
import { fetchSheetValues } from "../src/lib/google/sheets.ts";

const CLAVE = JSON.parse(
  readFileSync(
    "C:/Users/Daniela Spengler/Desktop/Claude/HOLT/CENFOR/_credenciales/cenfor-service-account.json",
    "utf8",
  ),
);
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = CLAVE.client_email;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = CLAVE.private_key;

const ID = "1axROvefosXxlhCiCqK9iTj4ulPaOvM-gMxYw2jirzjU";

async function probar(pestaña: string, combinaciones: string[][]) {
  const filas = await fetchSheetValues(ID, `${pestaña}!A1:AZ5000`);
  const enc = (filas[0] ?? []).map((e) => String(e).trim());
  const datos = filas.slice(1).filter((f) => f.some((v) => String(v ?? "") !== ""));
  console.log(`\n${pestaña} — ${datos.length} filas`);

  for (const combo of combinaciones) {
    const idx = combo.map((c) => enc.indexOf(c));
    if (idx.some((i) => i === -1)) {
      console.log(`  ✗ columna inexistente en [${combo.join(" + ")}]`);
      continue;
    }
    const claves = datos.map((f) => idx.map((i) => String(f[i] ?? "").trim()).join("|"));
    const unicas = new Set(claves);
    const dup = unicas.size < claves.length;
    console.log(
      `  ${dup ? "✗" : "✓"} ${combo.join(" + ")}  →  ${unicas.size}/${claves.length}`,
    );
    if (dup) {
      const cuenta = new Map<string, number>();
      for (const k of claves) cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
      const ejemplos = [...cuenta.entries()].filter(([, n]) => n > 1).slice(0, 3);
      for (const [k, n] of ejemplos) console.log(`      ${n}x  ${k}`);
    }
  }
}

async function main() {
  await probar("Rappi_Publicado", [
    ["Punto de venta", "Período inicio"],
    ["Punto de venta", "Período inicio", "Período fin"],
  ]);
  await probar("Rappi_Motivos_Ordenes", [
    ["Punto de venta", "Período inicio", "Motivo"],
    ["Punto de venta", "Período inicio", "Motivo", "Detalle del motivo"],
    ["Punto de venta", "Período inicio", "Período fin", "Motivo", "Detalle del motivo"],
  ]);
  await probar("Rappi_Motivos_Productos", [
    ["Punto de venta", "Período inicio", "Motivo", "Detalle del motivo", "Producto"],
    [
      "Punto de venta",
      "Período inicio",
      "Período fin",
      "Motivo",
      "Detalle del motivo",
      "Producto",
    ],
  ]);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
