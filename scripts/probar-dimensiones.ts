// Verificación del desglose por dimensión de las auditorías. No escribe nada.
//
// Corre el parser real contra la planilla viva y muestra, por local, el puntaje
// final y sus nueve dimensiones. Sirve para cruzar contra el informe en papel:
// los números tienen que ser los mismos.
//
//   npx tsx scripts/probar-dimensiones.ts

import { fetchSheetTitles, fetchSheetRanges } from "../src/lib/google/sheets.ts";
import { esPestañaDeAuditoria, parseAuditorias, rangosDe } from "../src/lib/parsers/auditorias.ts";
import { PLANILLAS } from "../src/lib/sync/fuentes.ts";

process.loadEnvFile(".env.local");

async function main() {
  const titulos = await fetchSheetTitles(PLANILLAS.auditorias);
  const pestañas = titulos.filter(esPestañaDeAuditoria);
  const rangos = await fetchSheetRanges(PLANILLAS.auditorias, pestañas.flatMap(rangosDe));
  const { filas, descartadas } = parseAuditorias(titulos, rangos);

  for (const a of filas) {
    console.log(`\n${a.audit_sheet_label} · ${a.audit_date} · final ${a.score_pct}%`);
    if (!a.categories.length) {
      console.log("   SIN DESGLOSE");
      continue;
    }
    for (const d of a.categories) {
      console.log(
        `   ${d.letra}  ${d.nombre.padEnd(22)} ${String(d.pct ?? "—").padStart(6)}%   peso ${d.peso_pct ?? "—"}%`,
      );
    }
    const suma = a.categories.reduce(
      (t, d) => t + ((d.pct ?? 0) / 100) * ((d.peso_pct ?? 0) / 100),
      0,
    );
    console.log(`   → suma ponderada: ${(suma * 100).toFixed(2)}%  (final: ${a.score_pct}%)`);
  }
  if (descartadas.length) console.log("\nDescartadas:", descartadas);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
