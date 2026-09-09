// Lista el catálogo de indicadores de delivery, canal por canal. No escribe.
//
//   npx tsx scripts/listar-indicadores.ts
//
// Sirve para decidir qué indicador de cada app entra en un cálculo: las tres
// publican cosas parecidas con nombres distintos, y esa equivalencia se declara
// en la tabla, no en el código.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data, error } = await supabase
    .from("delivery_metric_defs")
    .select("channel, clave, nombre, unidad, mejor_si_baja, destacado, orden")
    .order("channel")
    .order("orden");
  if (error) throw new Error(error.message);

  let canal = "";
  for (const d of data ?? []) {
    if (d.channel !== canal) {
      canal = d.channel;
      console.log(`\n═══ ${canal} ═══`);
    }
    console.log(
      `  ${String(d.clave).padEnd(28)} ${String(d.nombre).padEnd(34)} ${String(d.unidad).padEnd(8)}${d.destacado ? " ★" : ""}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
