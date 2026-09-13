// Prueba del cálculo del Resumen administrativo. No escribe nada.
//
//   npx tsx scripts/probar-economico.ts
//
// Parte 1, sin base: filas copiadas de `financials` el 11/09/2026 (agosto y
// julio 2026, mayo y enero 2025) contra los números de CA-28 en
// specs/C15-resumen-administrativo/requirements.md.
//
// Parte 2, contra la base viva (`.env.local`, mismo cliente que
// probar-score.ts): agosto, julio y enero–agosto 2026 (CA-28 y CA-29).
//
// Sale con código 1 si un número no da.

import { createClient } from "@supabase/supabase-js";
import {
  delMesFinanciero,
  serieMensual,
  totalizar,
  variacion,
  type FilaFinanciera,
  type Indicador,
  type Medida,
  type Totales,
} from "../src/lib/economico.ts";

let fallas = 0;

function chequear(nombre: string, prueba: () => string | null) {
  try {
    const error = prueba();
    if (error) {
      fallas++;
      console.log(`  ✗ ${nombre}: ${error}`);
    } else {
      console.log(`  ✓ ${nombre}`);
    }
  } catch (e) {
    fallas++;
    console.log(`  ✗ ${nombre}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Valor con tolerancia y cantidad de locales con dato. `esperado` null = sin dato. */
function medida(m: Medida, esperado: number | null, locales: number, tolerancia = 0.01) {
  return () => {
    if (esperado === null && m.valor !== null) return `esperaba sin dato, dio ${m.valor}`;
    if (esperado !== null && (m.valor === null || Math.abs(m.valor - esperado) > tolerancia))
      return `esperaba ${esperado}, dio ${m.valor}`;
    if (m.conDato.length !== locales)
      return `esperaba ${locales} locales con dato, dio ${m.conDato.length}`;
    return null;
  };
}

/** Los locales sin dato de una medida, en orden, contra lo esperado. */
function sinDato(m: Medida, esperado: string) {
  return () => (m.sinDato.join(",") === esperado ? null : `dio ${m.sinDato.join(",")}`);
}

// Los ids son los slugs: al cálculo solo le importa que distingan locales.
function fila(
  local: string,
  mes: string,
  ventas: number,
  ordenes: number | null,
  rentabilidad: number | null,
  fijos: number,
  variables: number,
  compras: number,
): FilaFinanciera {
  return {
    location_id: local,
    period_start: `${mes}-01`,
    ventas,
    ordenes,
    ticket_promedio: null,
    cmv: null,
    rentabilidad_neta_pct: rentabilidad,
    costos_fijos: null,
    costos_variables: null,
    compras_ventas_pct: compras,
    costos_fijos_pct: fijos,
    costos_variables_pct: variables,
    tipo_local: null,
  };
}

const AGOSTO_2026 = [
  fila("carlos-paz", "2026-08", 12429880, 435, -7.63, 37.8, 69.18, 68.61),
  fila("general-paz", "2026-08", 39765098, null, 10.82, 23.05, 65.2, 42.03),
  fila("nueva-cordoba", "2026-08", 37451865, 1442, 22.82, 27.72, 48.47, 36.24),
  fila("poeta-lugones", "2026-08", 20692110, null, 13.72, 34.36, 51.92, 39.29),
  fila("recta", "2026-08", 39378179, 1421, 2.96, 26.24, 69.87, 46.2),
  fila("urca", "2026-08", 38744543, 1302, 9.67, 22.71, 67.45, 44.5),
];

const JULIO_2026 = [
  fila("carlos-paz", "2026-07", 14374724, 533, 5.46, 34.93, 59.04, 45),
  fila("general-paz", "2026-07", 39814827, 1434, 2.53, 23.29, 73.26, 41.83),
  fila("nueva-cordoba", "2026-07", 37658579.5, 1375, -8.04, 27.87, 79.19, 38.99),
  // La fila incompleta de P1: variables y compras en 0, rentabilidad 93,57.
  fila("poeta-lugones", "2026-07", 23323394, 685, 93.57, 6.43, 0, 0),
  fila("recta", "2026-07", 42286170, 1419, 10.16, 24.29, 64.69, 45.83),
  fila("urca", "2026-07", 37993435, 1262, 7.51, 24.26, 68.05, 44.36),
];

const MAYO_2025 = [
  fila("carlos-paz", "2025-05", 16189396, 730, 3.67, 20.86, 73.4, 43.3),
  fila("general-paz", "2025-05", 39911158.5, 2055, null, 0, 0, 0),
  fila("nueva-cordoba", "2025-05", 40112609.9, 2159, null, 0, 0, 0),
  fila("recta", "2025-05", 38593702.5, 1831, null, 0, 0, 0),
  fila("urca", "2025-05", 37042102.37, 1681, null, 0, 0, 0),
];

const ENERO_2025 = [
  fila("carlos-paz", "2025-01", 16017756, 773, null, 0, 0, 0),
  fila("general-paz", "2025-01", 19494501, 995, null, 0, 0, 0),
  fila("nueva-cordoba", "2025-01", 15372955, 839, null, 0, 0, 0),
  fila("recta", "2025-01", 24010033, 1173, null, 0, 0, 0),
  fila("urca", "2025-01", 24558610.14, 1201, null, 0, 0, 0),
];

function probarAgostoYJulio() {
  console.log("Agosto 2026");
  const ago = totalizar(AGOSTO_2026);
  chequear("ventas 188.461.675 · 6", medida(ago.ventas, 188461675, 6, 1));
  chequear("órdenes 4.600 · 4", medida(ago.ordenes, 4600, 4, 0));
  chequear("ticket 27.827 · 4", medida(ago.ticket, 27827.06, 4, 0.5));
  chequear("sin órdenes: General Paz y Poeta Lugones", sinDato(ago.ordenes, "general-paz,poeta-lugones"));
  chequear("% fijos 26,79 · 6", medida(ago.costos_fijos_pct, 26.79, 6));
  chequear("% variables 62,12 · 6", medida(ago.costos_variables_pct, 62.12, 6));
  chequear("compras 43,71 · 6", medida(ago.compras_ventas_pct, 43.71, 6));
  chequear("rentabilidad 10,43 · 6", medida(ago.rentabilidad_neta_pct, 10.43, 6));

  console.log("Julio 2026");
  const jul = totalizar(JULIO_2026);
  chequear("ventas 195.451.129,5 · 6", medida(jul.ventas, 195451129.5, 6, 1));
  chequear("órdenes 6.708 · 6", medida(jul.ordenes, 6708, 6, 0));
  chequear("ticket 29.137 · 6", medida(jul.ticket, 29137, 6, 0.5));
  chequear("% fijos 23,42 · 6", medida(jul.costos_fijos_pct, 23.42, 6));
  chequear("% variables 70,11 · 5 (P2)", medida(jul.costos_variables_pct, 70.11, 5));
  chequear("compras 43,01 · 5", medida(jul.compras_ventas_pct, 43.01, 5));
  chequear("rentabilidad 3,44 · 5 (P1)", medida(jul.rentabilidad_neta_pct, 3.44, 5));
  chequear("rentabilidad sin dato en Poeta Lugones", sinDato(jul.rentabilidad_neta_pct, "poeta-lugones"));
}

function probarBordes() {
  console.log("Mayo 2025");
  const may = totalizar(MAYO_2025);
  chequear("% fijos 20,86 · 1", medida(may.costos_fijos_pct, 20.86, 1));
  chequear("ticket 20.323 · 5", medida(may.ticket, 20323, 5, 0.5));

  console.log("Enero 2025");
  const ene = totalizar(ENERO_2025);
  chequear("% fijos sin dato · 0", medida(ene.costos_fijos_pct, null, 0));
  chequear("% variables sin dato · 0", medida(ene.costos_variables_pct, null, 0));
  chequear("compras sin dato · 0", medida(ene.compras_ventas_pct, null, 0));
  chequear("rentabilidad sin dato · 0", medida(ene.rentabilidad_neta_pct, null, 0));
  chequear("ventas 99.453.855 · 5", medida(ene.ventas, 99453855.14, 5, 1));
  chequear("órdenes 4.981 · 5", medida(ene.ordenes, 4981, 5, 0));
  chequear("ticket 19.967 · 5", medida(ene.ticket, 19967, 5, 0.5));
}

// Sobre los locales que tienen el indicador en los dos meses: órdenes da
// +0,24% con los mismos 4 locales, no −31% contra los 6 de julio.
function probarVariacion() {
  console.log("Variación agosto vs julio 2026");
  const esperadas: [Indicador, number, number][] = [
    ["ventas", -3.576, 6],
    ["ordenes", 0.24, 4],
    ["ticket", -3.488, 4],
    // Sobre 5 locales y no 6: julio de Poeta Lugones tiene la estructura de
    // costos a medias (fijos 6,43% con los variables en 0), así que no entra en
    // la comparación. Con esa fila adentro daban 3,368 puntos, y el salto era
    // de la carga, no del negocio. Verificado contra la base: 25,7239 → 25,8555.
    ["costos_fijos_pct", 0.132, 5],
    ["costos_variables_pct", -6.739, 5],
    ["compras_ventas_pct", 1.241, 5],
    ["rentabilidad_neta_pct", 6.586, 5],
  ];
  for (const [indicador, delta, locales] of esperadas) {
    chequear(`${indicador} ${delta} · mismos ${locales}`, () => {
      const v = variacion(AGOSTO_2026, JULIO_2026, indicador);
      if (!v) return "dio null";
      if (Math.abs(v.delta - delta) > 0.01) return `esperaba ${delta}, dio ${v.delta}`;
      if (v.locales.length !== locales)
        return `esperaba ${locales} locales, dio ${v.locales.length}`;
      return null;
    });
  }
  chequear("sin mes anterior → null", () =>
    variacion(AGOSTO_2026, [], "ventas") === null ? null : "no dio null",
  );
  chequear("ningún local con dato en los dos meses → null", () =>
    variacion(MAYO_2025, ENERO_2025, "costos_fijos_pct") === null ? null : "no dio null",
  );
}

const nro = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

async function leerBase(): Promise<FilaFinanciera[]> {
  process.loadEnvFile(".env.local");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await supabase
    .from("financials")
    .select(
      "location_id, period_start, ventas, ordenes, ticket_promedio, cmv, rentabilidad_neta_pct, costos_fijos, costos_variables, compras_ventas_pct, costos_fijos_pct, costos_variables_pct, tipo_local",
    );
  // Una consulta que falla devuelve data en null: que no pase por «sin datos».
  if (error) throw new Error(`financials: ${error.message}`);

  return (data ?? []).map((f) => ({
    ...f,
    ventas: nro(f.ventas),
    ordenes: nro(f.ordenes),
    ticket_promedio: nro(f.ticket_promedio),
    cmv: nro(f.cmv),
    rentabilidad_neta_pct: nro(f.rentabilidad_neta_pct),
    costos_fijos: nro(f.costos_fijos),
    costos_variables: nro(f.costos_variables),
    compras_ventas_pct: nro(f.compras_ventas_pct),
    costos_fijos_pct: nro(f.costos_fijos_pct),
    costos_variables_pct: nro(f.costos_variables_pct),
  }));
}

function imprimir(titulo: string, t: Totales) {
  console.log(titulo);
  for (const [clave, m] of Object.entries(t)) {
    if (clave === "locales") continue;
    const { valor, conDato } = m as Medida;
    console.log(
      `     ${clave.padEnd(22)} ${valor === null ? "sin dato" : valor.toFixed(2)} · ${conDato.length} de ${t.locales.length}`,
    );
  }
}

async function parte2() {
  console.log("\nPARTE 2 · base viva\n");
  const filas = await leerBase();
  console.log(`   (financials: ${filas.length} filas)`);

  const agosto = delMesFinanciero(filas, "2026-08");
  const julio = delMesFinanciero(filas, "2026-07");
  const ago = totalizar(agosto);
  const jul = totalizar(julio);
  const anio = totalizar(filas.filter((f) => f.period_start.startsWith("2026-")));
  imprimir("Agosto 2026", ago);
  imprimir("Julio 2026", jul);
  imprimir("Enero–agosto 2026", anio);

  console.log("Chequeos");
  chequear("agosto: ticket 27.827 · 4", medida(ago.ticket, 27827.06, 4, 0.5));
  chequear("agosto: rentabilidad 10,43 · 6", medida(ago.rentabilidad_neta_pct, 10.43, 6));
  chequear("julio: % variables 70,11 · 5", medida(jul.costos_variables_pct, 70.11, 5));
  chequear("julio: rentabilidad 3,44 · 5", medida(jul.rentabilidad_neta_pct, 3.44, 5));
  chequear("2026: ventas 1.370.642.355", medida(anio.ventas, 1370642355, 6, 1));
  chequear("2026: órdenes 48.967", medida(anio.ordenes, 48967, 6, 0));
  chequear("2026: ticket 26.756", medida(anio.ticket, 26756, 6, 0.5));
  chequear("2026: % fijos 25,43", medida(anio.costos_fijos_pct, 25.43, 6));
  chequear("2026: compras 43,91", medida(anio.compras_ventas_pct, 43.91, 6));
  chequear("2026: % variables 69,64", medida(anio.costos_variables_pct, 69.64, 6));
  chequear("2026: rentabilidad 3,86", medida(anio.rentabilidad_neta_pct, 3.86, 6));
  chequear("variación órdenes +0,240 · mismos 4", () => {
    const v = variacion(agosto, julio, "ordenes");
    return v && Math.abs(v.delta - 0.24) <= 0.01 && v.locales.length === 4 ? null : `dio ${JSON.stringify(v)}`;
  });
  chequear("serieMensual 2026-08: 13 meses, ago 2025 a ago 2026", () => {
    const meses = serieMensual(filas, "2026-08").map((p) => p.mes);
    return meses.length === 13 && meses[0] === "2025-08" && meses[12] === "2026-08"
      ? null
      : `dio ${meses.join(", ")}`;
  });
}

// `exitCode` y no `process.exit()`: en Windows, salir con el fetch de Supabase
// todavía cerrando aborta Node («UV_HANDLE_CLOSING») y pisa el código de salida.
async function main() {
  console.log("PARTE 1 · filas fijas\n");
  probarAgostoYJulio();
  probarBordes();
  probarVariacion();
  await parte2();
  console.log(fallas ? `\n${fallas} chequeo(s) fallaron.` : "\nTodo da.");
  process.exitCode = fallas ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
