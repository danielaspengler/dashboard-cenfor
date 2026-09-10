// Cruza las dos hojas del formulario de mystery shopper: la de puntajes, que
// el sync lee para los números, y la de respuestas, de donde salen los
// comentarios. No escribe nada.
//
//   npx tsx scripts/probar-comentarios.ts [censurado|formaggio]
//
// Las une la marca temporal. Si una fila no encuentra su par, acá se ve por
// qué: los dos valores quedan impresos uno al lado del otro.

import { fetchSheetValues } from "../src/lib/google/sheets.ts";
import { HOJAS, PLANILLAS } from "../src/lib/sync/fuentes.ts";
import { parseComentarios, parseMysteryShopper } from "../src/lib/parsers/mystery.ts";

process.loadEnvFile(".env.local");

const marca = process.argv[2] === "formaggio" ? "formaggio" : "censurado";
const planilla = marca === "formaggio" ? PLANILLAS.msFormaggio : PLANILLAS.msCensurado;

async function main() {
  const [puntajes, respuestas] = await Promise.all([
    fetchSheetValues(planilla, HOJAS.mystery),
    fetchSheetValues(planilla, HOJAS.mysteryRespuestas),
  ]);

  const comentarios = parseComentarios(respuestas);
  console.log(`respuestas con marca temporal: ${comentarios.size}`);
  for (const [ts, c] of [...comentarios].slice(0, 3)) {
    console.log(`   ${ts}  lo_mejor: ${c.lo_mejor?.slice(0, 40) ?? "—"}`);
  }

  const { filas } = parseMysteryShopper(puntajes, {
    marca: marca as "censurado" | "formaggio",
    conBloques: marca === "censurado",
  });
  console.log(`\nvisitas en la hoja de puntajes: ${filas.length}`);
  for (const v of filas) {
    const c = v.form_timestamp ? comentarios.get(v.form_timestamp) : undefined;
    console.log(
      `   ${v.ms_form_label.padEnd(16)} ${v.form_timestamp ?? "sin marca temporal"}  →  ${
        c ? `OK · ${c.lo_mejor?.slice(0, 35) ?? "(sin texto)"}` : "NO MATCHEA"
      }`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
