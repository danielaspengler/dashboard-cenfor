// Cruza los encabezados que el catálogo espera contra los que la planilla
// tiene hoy, canal por canal. No escribe nada.
//
//   npx tsx scripts/comparar-headers.ts [rappi|pedidos_ya|uber]
//
// El sync avisa cuando una columna del catálogo no aparece en la planilla,
// pero no dice cuál se le parece. Esto sí: es lo que hace falta cuando el
// cliente corrige un encabezado y el indicador deja de entrar.

import { createClient } from "@supabase/supabase-js";
import { fetchSheetValues } from "../src/lib/google/sheets.ts";
import { CANALES_DELIVERY } from "../src/lib/sync/fuentes.ts";
import { normalizar } from "../src/lib/parsers/comunes.ts";

process.loadEnvFile(".env.local");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const soloCanal = process.argv[2];
  const { data: defs, error } = await supabase
    .from("delivery_metric_defs")
    .select("channel, clave, sheet_header")
    .order("channel");
  if (error) throw new Error(error.message);

  for (const canal of CANALES_DELIVERY) {
    if (soloCanal && canal.canal !== soloCanal) continue;
    const filas = await fetchSheetValues(canal.planilla, canal.hojas.metricas);
    const enPlanilla = (filas[0] ?? []).map((h) => String(h ?? "").trim());
    const normalizados = new Map(enPlanilla.map((h) => [normalizar(h), h]));

    console.log(`\n═══ ${canal.canal} · ${enPlanilla.length} columnas en la planilla`);
    for (const d of (defs ?? []).filter((x) => x.channel === canal.canal)) {
      const esperado = String(d.sheet_header ?? "");
      if (normalizados.has(normalizar(esperado))) continue;
      // No está: se busca el encabezado más parecido para poder decidir si
      // el cliente lo renombró o si la columna desapareció.
      const parecido = enPlanilla.find((h) => {
        const a = normalizar(h).replace(/[^a-z0-9]/g, "");
        const b = normalizar(esperado).replace(/[^a-z0-9]/g, "");
        return a.startsWith(b.slice(0, 8)) || b.startsWith(a.slice(0, 8));
      });
      console.log(`  ✗ ${d.clave}`);
      console.log(`      catálogo: «${esperado}»`);
      console.log(`      planilla: ${parecido ? `«${parecido}»` : "nada parecido"}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
