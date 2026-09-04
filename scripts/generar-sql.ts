// Genera el SQL de carga a partir de las planillas reales.
//
// Cada INSERT usa `insert ... select ... from locations where <llave>`:
// si el local no matchea, no se inserta nada en vez de guardar una fila
// huérfana. Y todos llevan `on conflict do nothing`, así correrlo dos
// veces no duplica.
//
//   npx tsx scripts/generar-sql.ts > carga.sql

import { readFileSync } from "node:fs";
import { fetchSheetValues, fetchSheetTitles, fetchSheetRanges } from "../src/lib/google/sheets.ts";
import { parseResenas, parseSnapshot } from "../src/lib/parsers/resenas.ts";
import { parseMysteryShopper } from "../src/lib/parsers/mystery.ts";
import { parseAuditorias, rangosDe, esPestañaDeAuditoria } from "../src/lib/parsers/auditorias.ts";

const K = JSON.parse(
  readFileSync(
    "C:/Users/Daniela Spengler/Desktop/Claude/HOLT/CENFOR/_credenciales/cenfor-service-account.json",
    "utf8",
  ),
);
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = K.client_email;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = K.private_key;

const P = {
  resenas: "1X4V6tnKixSKWQA4826sn6I5q7DvlBrKvLy91aAdTR7Y",
  msFormaggio: "1HrTI7falAXeRA27ptYsQFB5SSPj1qmXegSVaE39-FRs",
  msCensurado: "1qFA7u1Ztj498E80qcp5CzvsDppyFcowVnCR8lR-Rgq4",
  auditorias: "1iw9bqR5cz9GLo29agblb3mZKJ71XdG0eUBMgqeHl7XM",
};

const txt = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const num = (v: number | null) => (v === null ? "null" : String(v));
const bool = (v: boolean) => (v ? "true" : "false");
const out: string[] = [];

// ── Reseñas ──────────────────────────────────────────────────────────
const resenas = parseResenas(await fetchSheetValues(P.resenas, "resenas"));
out.push("-- reseñas");
for (const r of resenas.filas) {
  out.push(
    `insert into public.reviews (location_id, google_review_id, author, review_date, rating, text, source)
select l.id, ${txt(r.google_review_id)}, ${txt(r.author)}, ${txt(r.review_date)}, ${num(r.rating)}, ${txt(r.text)}, 'sheets:resenas'
from public.locations l where l.google_place_id = ${txt(r.place_id)}
on conflict (google_review_id) do nothing;`,
  );
}

// ── Snapshot del acumulado ───────────────────────────────────────────
const snap = parseSnapshot(await fetchSheetValues(P.resenas, "Rating_Snapshot"));
out.push("\n-- snapshot del acumulado por local");
for (const s of snap.filas) {
  out.push(
    `insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, ${txt(s.scraped_on)}, ${s.scraped_at ? txt(new Date(Number(s.scraped_at) ? (Number(s.scraped_at) - 25569) * 86400000 : Date.parse(s.scraped_at)).toISOString()) : "null"}, ${num(s.reviews_count)}, ${num(s.total_score)}
from public.locations l where l.google_place_id = ${txt(s.place_id)}
on conflict (location_id, scraped_on) do nothing;`,
  );
}

// ── Mystery shopper ──────────────────────────────────────────────────
for (const [marca, id, bloques] of [
  ["formaggio", P.msFormaggio, false],
  ["censurado", P.msCensurado, true],
] as const) {
  const ms = parseMysteryShopper(await fetchSheetValues(id, "Puntajes por Visita"), {
    marca,
    conBloques: bloques,
  });
  out.push(`\n-- mystery shopper ${marca}`);
  for (const v of ms.filas) {
    // El texto del local se compara DENTRO de la marca: "Nueva Cordoba"
    // de Formaggio y "Nueva Córdoba" de Censurado son locales distintos.
    out.push(
      `insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, ${txt(v.form_timestamp)}, ${txt(v.visit_date)}, ${txt(v.evaluator)}, ${txt(v.experience_type)},
       ${num(v.score_pct)}, ${num(v.points_obtained)}, ${num(v.points_max)}, ${txt(v.classification)},
       ${txt(JSON.stringify(v.sections))}::jsonb, ${bool(v.needs_review)}, ${txt(`sheets:ms-${marca}`)}, ${txt(v.source_row_hash)}
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = ${txt(marca)} and lower(l.ms_form_label) = lower(${txt(v.ms_form_label)})
on conflict (source_row_hash) do nothing;`,
    );
  }
}

// ── Auditorías presenciales ──────────────────────────────────────────
const titulos = await fetchSheetTitles(P.auditorias);
const pestañas = titulos.filter(esPestañaDeAuditoria);
const rangos = await fetchSheetRanges(P.auditorias, pestañas.flatMap(rangosDe));
const aud = parseAuditorias(titulos, rangos);
out.push("\n-- auditorías presenciales (solo Censurado)");
for (const a of aud.filas) {
  out.push(
    `insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, ${txt(a.audit_date)}, ${txt(a.auditor)}, ${txt(a.franchisee)}, ${num(a.score_pct)}, ${txt(a.source_sheet)}, ${txt(a.source_row_hash)}
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower(${txt(a.audit_sheet_label)})
on conflict (source_row_hash) do nothing;`,
  );
}

console.log(out.join("\n"));
