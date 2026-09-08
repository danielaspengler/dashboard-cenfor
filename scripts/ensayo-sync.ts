// Ensayo en seco del sync completo, contra las planillas REALES.
//
// Corre exactamente el mismo `ejecutarSync` que la ruta `/api/sync`, pero con
// un Supabase falso: las tablas de referencia se leen de la base y los upserts
// se cuentan en memoria en vez de escribirse. Sirve para verificar la parte que
// más se puede romper —el matcheo de cada texto de planilla con un local o un
// punto de venta— sin escribir una sola fila.
//
//   npx tsx scripts/ensayo-sync.ts
//
// Cuando la key esté cargada, la prueba de verdad es la ruta:
//   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/sync

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ejecutarSync } from "../src/lib/sync/ejecutar.ts";
import { FUENTES } from "../src/lib/sync/fuentes.ts";

// Las credenciales salen de `.env.local`, la MISMA fuente que usa la app.
//
// Antes este script leía un JSON de credenciales por ruta absoluta. Al rotar la
// clave de Google (08/09/2026) el ensayo siguió usando la vieja y falló con
// "Invalid JWT Signature" mientras la app andaba perfecto: el script mentía
// sobre el estado real. Leyendo de `.env.local` no pueden volver a divergir, y
// no hace falta que exista ningún archivo de claves suelto en el disco.
process.loadEnvFile(".env.local");

for (const v of ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"]) {
  if (!process.env[v]) {
    console.error(`Falta ${v} en .env.local — sin eso el ensayo no puede leer las planillas.`);
    process.exit(1);
  }
}

// Copia fiel del seed (20260903120200_seed_marcas_areas_y_locales.sql).
// Si el seed cambia, esto queda viejo — es una maqueta de prueba, no la fuente.
const LOCALES = [
  ["censurado-recta", "censurado", "ChIJsydZIZufMpQR15UFXpetqr0", "Recta", "Recta"],
  ["censurado-carlos-paz", "censurado", "ChIJNRr3ox9nLZQRNU3Neh4PaYA", "Carlos Paz", "Carlos Paz"],
  ["censurado-general-paz", "censurado", "ChIJ-VIhviCjMpQRdsd1qDkDq_M", "General Paz", "GENERAL PAZ"],
  ["censurado-urca", "censurado", "ChIJa2cWiXmZMpQRcItMChl0WEs", "Urca", "URCA"],
  ["censurado-poeta-lugones", "censurado", "ChIJhyvxXv-ZMpQRxWijKRAWC_c", null, null],
  ["censurado-luuma", "censurado", null, null, "Luuma"],
  ["censurado-nueva-cordoba", "censurado", "ChIJBckoomijMpQRzLCSWoM5XcQ", "Nueva Córdoba", "Nueva Cordoba"],
  ["formaggio-tejeda", "formaggio", "ChIJU-UsAJ2ZMpQRK_lndZC8jOQ", "Tejeda", null],
  ["formaggio-villa-allende", "formaggio", "ChIJy2X1ByqdMpQRY3o942jJi3o", "Villa Allende", null],
  ["formaggio-nueva-cordoba", "formaggio", "ChIJE1hOo9ijMpQRcAZkNHay_CI", "Nueva Cordoba", null],
].map(([slug, marca, place, ms, aud]) => ({
  id: slug as string, // el slug hace de id: se lee mejor en la salida
  slug,
  google_place_id: place,
  ms_form_label: ms,
  audit_sheet_label: aud,
  brands: { slug: marca },
}));

const escrituras: Record<string, Record<string, unknown>[]> = {};

// Las tablas de referencia se LEEN de la base real; las escrituras siguen
// siendo de mentira.
//
// Delivery cambió las reglas del ensayo. Un local se identifica con cinco
// datos y una copia del seed acá adentro alcanzaba; los puntos de venta son 46
// con 47 etiquetas de planilla, y los indicadores 36 con su unidad y su
// encabezado. Copiar todo eso a mano garantiza que un día quede viejo y el
// ensayo mienta —que es justo lo que pasó cuando el script leía la clave de
// Google de un JSON suelto—. Leyéndolo de la base, el ensayo verifica el seed
// que de verdad está aplicado.
//
// Sigue sin escribir una sola fila: `upsert` cuenta en memoria.
const real = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const REFERENCIA = ["locations", "delivery_point_labels", "delivery_metric_defs"];

const falso = {
  from(tabla: string) {
    return {
      select: async (columnas?: string) => {
        if (!REFERENCIA.includes(tabla)) return { data: [], error: null };
        if (real) return await real.from(tabla).select(columnas ?? "*");
        // Sin la clave de servidor el ensayo igual corre, con el seed copiado
        // de los locales. Delivery va a descartar todo y lo dice.
        return tabla === "locations"
          ? { data: LOCALES, error: null }
          : { data: [], error: null };
      },
      upsert: async (filas: Record<string, unknown>[]) => {
        (escrituras[tabla] ??= []).push(...filas);
        return { error: null };
      },
    };
  },
} as unknown as SupabaseClient;

// Envuelto en main(): tsx compila a CJS y ahí el await de nivel superior no existe.
async function main() {
  const { locales, resultados } = await ejecutarSync(falso, [...FUENTES]);

  console.log(`\nlocales en el directorio: ${locales}\n`);
  for (const r of resultados) {
    console.log("─".repeat(70));
    if (!r.ok) {
      console.log(`${r.fuente.toUpperCase()} — FALLÓ: ${r.error}`);
      continue;
    }
    console.log(`${r.fuente.toUpperCase()} — leídas ${r.leidas} · a guardar ${r.guardadas}`);
    if (r.descartadas.length) {
      console.log(`  descartadas: ${r.descartadas.length}`);
      for (const d of r.descartadas) console.log(`   · ${d.motivo} → ${d.detalle}`);
    } else {
      console.log("  descartadas: ninguna");
    }
  }

  console.log("\n" + "─".repeat(70) + "\nA qué local fue a parar cada fila:\n");
  for (const [tabla, filas] of Object.entries(escrituras)) {
    const porLocal = new Map<string, number>();
    for (const f of filas) {
      const k = String(f.location_id ?? "SIN LOCAL");
      porLocal.set(k, (porLocal.get(k) ?? 0) + 1);
    }
    console.log(`${tabla} (${filas.length})`);
    for (const [local, n] of [...porLocal].sort()) {
      console.log(`   ${String(n).padStart(4)}  ${local}`);
    }
  }
}

main();
