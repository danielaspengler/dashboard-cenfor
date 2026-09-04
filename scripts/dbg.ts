import { readFileSync } from "node:fs";
import { fetchSheetValues, fetchSheetRanges } from "../src/lib/google/sheets.ts";
const K = JSON.parse(readFileSync("C:/Users/Daniela Spengler/Desktop/Claude/HOLT/CENFOR/_credenciales/cenfor-service-account.json","utf8"));
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = K.client_email;
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = K.private_key;

const v = await fetchSheetValues("1HrTI7falAXeRA27ptYsQFB5SSPj1qmXegSVaE39-FRs", "Puntajes por Visita!A2:E5");
console.log("=== MS Formaggio, columnas A:E ===");
for (const f of v) console.log(JSON.stringify(f));

const r = await fetchSheetRanges("1iw9bqR5cz9GLo29agblb3mZKJ71XdG0eUBMgqeHl7XM", ["'Gral Paz'!A1:AB8"]);
console.log("\n=== Auditoría «Gral Paz», A1:AB8 ===");
const filas = r["'Gral Paz'!A1:AB8"];
filas.forEach((f, i) => {
  const celdas = f.map((c, j) => c ? `[${String.fromCharCode(65+j)}${i+1}] ${c}` : null).filter(Boolean);
  if (celdas.length) console.log("  " + celdas.join("  |  "));
});
