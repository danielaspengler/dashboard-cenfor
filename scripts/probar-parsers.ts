// Prueba los tres parsers contra las planillas REALES de CENFOR.
// No escribe nada: solo muestra qué se guardaría y qué se descartaría.
//
//   node --experimental-strip-types scripts/probar-parsers.ts

import { readFileSync } from "node:fs";
import { fetchSheetValues, fetchSheetTitles, fetchSheetRanges } from "../src/lib/google/sheets.ts";
import { parseResenas, parseSnapshot } from "../src/lib/parsers/resenas.ts";
import { parseMysteryShopper } from "../src/lib/parsers/mystery.ts";
import { parseAuditorias, rangosDe, esPestañaDeAuditoria } from "../src/lib/parsers/auditorias.ts";

const CLAVE = JSON.parse(
  readFileSync(
    "C:/Users/Daniela Spengler/Desktop/Claude/HOLT/CENFOR/_credenciales/cenfor-service-account.json",
    "utf8",
  ),
);
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = CLAVE.client_email;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = CLAVE.private_key;

const PLANILLAS = {
  resenas: "1X4V6tnKixSKWQA4826sn6I5q7DvlBrKvLy91aAdTR7Y",
  msFormaggio: "1HrTI7falAXeRA27ptYsQFB5SSPj1qmXegSVaE39-FRs",
  msCensurado: "1qFA7u1Ztj498E80qcp5CzvsDppyFcowVnCR8lR-Rgq4",
  auditorias: "1iw9bqR5cz9GLo29agblb3mZKJ71XdG0eUBMgqeHl7XM",
};

function titulo(t: string) {
  console.log("\n" + "─".repeat(70) + "\n" + t + "\n" + "─".repeat(70));
}

function descartes(d: { motivo: string; detalle: string }[]) {
  if (!d.length) return console.log("descartadas: ninguna");
  console.log(`descartadas: ${d.length}`);
  for (const x of d) console.log(`   · ${x.motivo} → ${x.detalle}`);
}

const r = await fetchSheetValues(PLANILLAS.resenas, "resenas");
const reseñas = parseResenas(r);
titulo(`RESEÑAS — ${reseñas.filas.length} de ${r.length - 1} filas`);
for (const x of reseñas.filas.slice(0, 3)) {
  console.log(`  ${x.review_date} · ${x.rating}★ · ${x.author} · ${x.place_id.slice(0, 14)}…`);
}
console.log(`  … (${Math.max(0, reseñas.filas.length - 3)} más)`);
descartes(reseñas.descartadas);
const places = new Set(reseñas.filas.map((x) => x.place_id));
console.log(`locales distintos en las reseñas: ${places.size}`);

const s = await fetchSheetValues(PLANILLAS.resenas, "Rating_Snapshot");
const snap = parseSnapshot(s);
titulo(`SNAPSHOT — ${snap.filas.length} locales`);
for (const x of snap.filas) {
  console.log(`  ${x.scraped_on} · ${String(x.total_score).padEnd(4)}★ · ${String(x.reviews_count).padStart(4)} reseñas · ${x.place_id.slice(0, 14)}…`);
}
descartes(snap.descartadas);

for (const [marca, id, bloques] of [
  ["formaggio", PLANILLAS.msFormaggio, false],
  ["censurado", PLANILLAS.msCensurado, true],
] as const) {
  const v = await fetchSheetValues(id, "Puntajes por Visita");
  const ms = parseMysteryShopper(v, { marca, conBloques: bloques });
  titulo(`MYSTERY SHOPPER ${marca.toUpperCase()} — ${ms.filas.length} visitas`);
  for (const x of ms.filas) {
    const flag = x.needs_review ? "  ⚠ REVISAR" : "";
    console.log(
      `  ${x.visit_date} · ${String(x.score_pct).padStart(6)}% · ${x.classification.padEnd(10)} · ${x.experience_type.padEnd(9)} · ${x.ms_form_label}${flag}`,
    );
    console.log(`      secciones: ${JSON.stringify(x.sections)}`);
  }
  descartes(ms.descartadas);
}

const titulos = await fetchSheetTitles(PLANILLAS.auditorias);
const pestañas = titulos.filter(esPestañaDeAuditoria);
const rangos = await fetchSheetRanges(PLANILLAS.auditorias, pestañas.flatMap(rangosDe));
const aud = parseAuditorias(titulos, rangos);
titulo(`AUDITORÍAS — ${aud.filas.length} de ${pestañas.length} pestañas`);
for (const x of aud.filas) {
  console.log(
    `  ${x.audit_date} · ${String(x.score_pct).padStart(6)}% · pestaña «${x.source_sheet}» → LOCAL «${x.audit_sheet_label}» · auditor: ${x.auditor ?? "—"}`,
  );
}
descartes(aud.descartadas);
console.log(`\npestañas ignoradas: ${titulos.filter((t) => !esPestañaDeAuditoria(t)).join(", ") || "ninguna"}`);
