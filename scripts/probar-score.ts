// El score de calidad de cada local, mes por mes. No escribe nada.
//
//   npx tsx scripts/probar-score.ts [YYYY-MM]
//
// Muestra el desglose por eje para poder cruzarlo contra el informe en papel:
// cada eje con su valor, su peso y de dónde salió.

import { createClient } from "@supabase/supabase-js";
import { calcularScore } from "../src/lib/score.ts";
import { PESOS_SCORE } from "../src/lib/marca.ts";

process.loadEnvFile(".env.local");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MES = process.argv[2] ?? "2026-08";

async function main() {
  const [locales, marcas, visitas, auditorias, snapshots, puntos, valores, defs] =
    await Promise.all([
      supabase.from("locations").select("id, name, slug, brand_id").eq("activo", true),
      supabase.from("brands").select("id, slug, name"),
      supabase.from("mystery_shopper_visits").select("*"),
      supabase.from("audits").select("*"),
      supabase.from("review_snapshots").select("*").order("scraped_on", { ascending: false }),
      supabase
        .from("delivery_points")
        .select("id, location_id, channel, formato, name, activo, sub_brands(name)"),
      supabase.from("delivery_metric_values").select("*"),
      supabase.from("delivery_metric_defs").select("*"),
    ]);

  // Una consulta que falla devuelve data en null y el script diría "sin
  // datos" en vez de "no pude leer". Ya pasó una vez en la pantalla de
  // Delivery: no vuelve a pasar en silencio.
  for (const [nombre, r] of Object.entries({ locales, marcas, visitas, auditorias, snapshots, puntos, valores, defs })) {
    if (r.error) throw new Error(`${nombre}: ${r.error.message}`);
    console.log(`   (${nombre}: ${r.data?.length ?? 0} filas)`);
  }

  const marcaPorId = new Map((marcas.data ?? []).map((m) => [m.id, m]));
  const snapPorLocal = new Map<string, (typeof snapshots.data)[number]>();
  for (const s of snapshots.data ?? []) if (!snapPorLocal.has(s.location_id)) snapPorLocal.set(s.location_id, s);

  const puntosNormalizados = (puntos.data ?? []).map((p) => ({
    ...p,
    local: "",
    localSlug: "",
    marcaB: (p.sub_brands as unknown as { name: string } | null)?.name ?? null,
  }));

  console.log(`SCORE DE CALIDAD · ${MES}\n`);
  for (const l of locales.data ?? []) {
    const marca = marcaPorId.get(l.brand_id);
    const score = calcularScore({
      mes: MES,
      marcaSlug: marca?.slug ?? "",
      locationId: l.id,
      visitas: (visitas.data ?? []) as never,
      auditorias: (auditorias.data ?? []) as never,
      snapshot: snapPorLocal.get(l.id) as never,
      puntos: puntosNormalizados as never,
      valores: (valores.data ?? []).map((v) => ({ ...v, valor: v.valor === null ? null : Number(v.valor) })) as never,
      defs: (defs.data ?? []) as never,
    });

    const pesos = PESOS_SCORE[marca?.slug ?? ""] ?? {};
    console.log(
      `${(marca?.name + " · " + l.name).padEnd(34)} ${score.valor === null ? "sin datos" : score.valor.toFixed(2) + "%"}` +
        `   (modelo de ${Object.values(pesos).filter(Boolean).length} ejes)`,
    );
    for (const e of score.ejes) {
      console.log(
        `     ${e.nombre.padEnd(16)} ${(e.valor === null ? "—" : e.valor.toFixed(2)).padStart(7)}` +
          `  peso ${String(e.peso).padStart(2)}%   ${e.detalle}`,
      );
    }
    if (score.sinDato.length) {
      console.log(`     → peso redistribuido: ${score.sinDato.map((e) => e.nombre).join(", ")}`);
    }
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
