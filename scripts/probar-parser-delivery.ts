// Prueba el parser de delivery contra la planilla REAL de Rappi y contra los
// puntos de venta sembrados en la base. No escribe nada: muestra qué se
// guardaría y qué se descartaría.
//
//   npx tsx scripts/probar-parser-delivery.ts

import { readFileSync } from "node:fs";
import { fetchSheetValues } from "../src/lib/google/sheets.ts";
import { parseDeliveryMetrics, parseDeliveryIssues } from "../src/lib/parsers/delivery.ts";

const CLAVE = JSON.parse(
  readFileSync(
    "C:/Users/Daniela Spengler/Desktop/Claude/HOLT/CENFOR/_credenciales/cenfor-service-account.json",
    "utf8",
  ),
);
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = CLAVE.client_email;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = CLAVE.private_key;

const ID = "1axROvefosXxlhCiCqK9iTj4ulPaOvM-gMxYw2jirzjU";

// Los 21 puntos de venta sembrados en `delivery_points` para el canal Rappi.
// Se listan acá para poder correr la prueba sin credenciales de Supabase,
// igual que el ensayo en seco del resto del sync.
const PUNTOS_SEMBRADOS = new Set([
  "Censurado - Carlos Paz",
  "Censurado - General Paz",
  "Censurado - General Paz - Turbo",
  "Censurado - Nueva Córdoba",
  "Censurado - Nueva Córdoba - Turbo",
  "Censurado - Poeta Lugones",
  "Censurado - Recta",
  "Censurado - Urca",
  "Censurado - Urca - Turbo",
  "Burger Club - Carlos Paz",
  "Burger Club - General Paz",
  "Burger Club - Nueva Córdoba",
  "Burger Club - Recta",
  "Burger Club - Urca",
  "Lomos la Catedral - Carlos Paz",
  "Lomos la Catedral - General Paz",
  "Lomos la Catedral - General Paz - Turbo",
  "Lomos la Catedral - Nueva Córdoba",
  "Lomos la Catedral - Nueva Córdoba - Turbo",
  "Lomos la Catedral - Recta",
  "Lomos la Catedral - Urca",
]);

function reportarPuntos(etiquetas: string[]) {
  const sinPunto = [...new Set(etiquetas.filter((e) => !PUNTOS_SEMBRADOS.has(e)))];
  if (sinPunto.length === 0) {
    console.log("  ✓ todos los puntos de venta matchean");
  } else {
    console.log(`  ✗ ${sinPunto.length} punto(s) sin sembrar:`);
    for (const p of sinPunto) console.log(`      ${p}`);
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("INDICADORES — Rappi_Publicado");
  console.log("=".repeat(70));
  const pub = await fetchSheetValues(ID, "Rappi_Publicado!A1:AZ5000");
  const met = parseDeliveryMetrics(pub);
  console.log(`  ${met.filas.length} filas parseadas · ${met.descartadas.length} descartadas`);
  reportarPuntos(met.filas.map((f) => f.sheetLabel));
  for (const d of met.descartadas) console.log(`  descartada: ${d.motivo} — ${d.detalle}`);

  const m = met.filas.find((f) => f.sheetLabel === "Censurado - Urca");
  if (m) {
    console.log("\n  Ejemplo (Censurado - Urca):");
    console.log(`    período          ${m.periodStart} → ${m.periodEnd}`);
    console.log(`    cancelaciones    ${m.cancelacionesPct}%`);
    console.log(`    reclamos         ${m.reclamosPct}%  (${m.ordenesConReclamos} órdenes)`);
    console.log(`    disponibilidad   ${m.disponibilidadPct}%`);
    console.log(`    con demora       ${m.ordenesConDemoraPct}%`);
    console.log(`    compensación     $${m.compensacionPagada}`);
    console.log(`    calificación     ${m.calificacionPromedio} sobre ${m.cantidadResenas} reseñas`);
  }

  for (const [hoja, scope] of [
    ["Rappi_Motivos_Ordenes", "orden"],
    ["Rappi_Motivos_Productos", "producto"],
  ] as const) {
    console.log("\n" + "=".repeat(70));
    console.log(`MOTIVOS — ${hoja}`);
    console.log("=".repeat(70));
    const filas = await fetchSheetValues(ID, `${hoja}!A1:AZ5000`);
    const res = parseDeliveryIssues(filas, scope);
    console.log(`  ${res.filas.length} filas parseadas · ${res.descartadas.length} descartadas`);
    reportarPuntos(res.filas.map((f) => f.sheetLabel));
    for (const d of res.descartadas) console.log(`  descartada: ${d.motivo} — ${d.detalle}`);

    // Las claves únicas de la tabla, verificadas sobre lo que el parser devuelve.
    const claves = res.filas.map(
      (f) =>
        `${f.sheetLabel}|${f.periodStart}|${f.periodEnd}|${f.scope}|${f.motivo}|${f.detalle}|${f.producto}`,
    );
    const unicas = new Set(claves).size;
    console.log(
      `  clave única: ${unicas}/${claves.length}` +
        (unicas === claves.length ? "  ✓" : "  ✗ HAY DUPLICADOS"),
    );
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
