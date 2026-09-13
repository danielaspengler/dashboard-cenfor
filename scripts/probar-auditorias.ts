// Prueba del corte metodológico de auditorías (C16). No lee la base ni escribe nada.
//
//   npx tsx scripts/probar-auditorias.ts
//
// Va con filas fijas y no contra la base a propósito: `audits` tiene 6 filas y
// todas son de agosto 2026, así que el caso que importa —un conjunto que cruza
// el corte— no existe todavía en ninguna pantalla. El histórico entra por otra
// feature (P2 de requirements.md). Hasta entonces, esto es lo único que prueba
// que el guardarraíl funciona.
//
// Dos tramos:
//  - Agosto 2026: las 6 auditorías tal como están en la base, verificadas el
//    13/09/2026. Promedian 77,005.
//  - Antes del corte: 110 visitas que promedian 89,4, con julio 2026 en 86,4.
//    Es una muestra con la FORMA del histórico del Looker, no sus filas reales.
//
// Sale con código 1 si un número no da.

import { escalaAuditoria } from "../src/lib/marca.ts";
import {
  promedioAuditorias,
  serieAuditorias,
  type FilaAuditoria,
} from "../src/lib/auditorias.ts";

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

const casi = (valor: number | null, esperado: number, tolerancia = 0.01) =>
  valor !== null && Math.abs(valor - esperado) <= tolerancia;

// ── Las filas ────────────────────────────────────────────────────────────

const AGOSTO_2026: FilaAuditoria[] = [
  { audit_date: "2026-08-09", score_pct: 75.23 }, // Nueva Córdoba
  { audit_date: "2026-08-21", score_pct: 67.17 }, // General Paz
  { audit_date: "2026-08-22", score_pct: 75.56 }, // Urca
  { audit_date: "2026-08-23", score_pct: 86.04 }, // Carlos Paz
  { audit_date: "2026-08-28", score_pct: 85.46 }, // Luuma
  { audit_date: "2026-08-29", score_pct: 72.57 }, // Recta
];

// Ene 2025 a jun 2026 **sin marzo 2025**: ese hueco prueba que la serie deja el
// mes en null en vez de saltearlo, que es lo que hace que el gráfico dibuje un
// corte de línea y no una recta que cruza un mes sin datos.
const MESES_ANTERIORES = [
  "2025-01", "2025-02", "2025-04", "2025-05", "2025-06", "2025-07",
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
];

const repetir = (mes: string, veces: number, pct: number): FilaAuditoria[] =>
  Array.from({ length: veces }, (_, i) => ({
    audit_date: `${mes}-${String(i + 1).padStart(2, "0")}`,
    score_pct: pct,
  }));

// 100 visitas a 89,7 + 10 de julio a 86,4 = 110 que promedian 89,4 exacto.
const ANTES_DEL_CORTE: FilaAuditoria[] = [
  ...MESES_ANTERIORES.flatMap((mes, i) => repetir(mes, i === 0 ? 4 : 6, 89.7)),
  ...repetir("2026-07", 10, 86.4),
];

const TODAS = [...ANTES_DEL_CORTE, ...AGOSTO_2026];

// ── La escala de una fecha ───────────────────────────────────────────────

function probarEscala() {
  console.log("escalaAuditoria()");
  const casos: [string | null | undefined, string][] = [
    ["2026-07-31", "anterior"],
    ["2026-08-01", "nueva"],
    ["2026-08-29", "nueva"],
    ["2025-01-15", "anterior"],
    ["", "desconocida"],
    [null, "desconocida"],
    [undefined, "desconocida"],
    ["sin fecha", "desconocida"],
  ];
  for (const [fecha, esperado] of casos) {
    chequear(`${JSON.stringify(fecha)} → ${esperado}`, () => {
      const dio = escalaAuditoria(fecha);
      return dio === esperado ? null : `dio ${dio}`;
    });
  }
}

// ── El promedio que no puede cruzar el corte ─────────────────────────────

function probarPromedio() {
  console.log("promedioAuditorias()");

  chequear("las 116 juntas → mixto, 77,005 en 6 y 89,4 en 110", () => {
    const p = promedioAuditorias(TODAS);
    if (p.tipo !== "mixto") return `dio tipo ${p.tipo}`;
    if (!casi(p.nueva.valor, 77.005)) return `tramo nuevo dio ${p.nueva.valor}`;
    if (p.nueva.visitas !== 6) return `tramo nuevo dio ${p.nueva.visitas} visitas`;
    if (!casi(p.anterior.valor, 89.4)) return `tramo anterior dio ${p.anterior.valor}`;
    if (p.anterior.visitas !== 110) return `tramo anterior dio ${p.anterior.visitas} visitas`;
    return null;
  });

  // La garantía de la feature: un conjunto mixto NO tiene un número único que
  // una pantalla pueda imprimir por descuido.
  chequear("un conjunto mixto no trae ningún número único", () => {
    const p = promedioAuditorias(TODAS);
    return p.tipo === "mixto" && !("valor" in p) ? null : "el mixto trae un valor único";
  });

  chequear("solo agosto 2026 → único, escala nueva, 77,005 en 6", () => {
    const p = promedioAuditorias(AGOSTO_2026);
    if (p.tipo !== "unico") return `dio tipo ${p.tipo}`;
    if (p.escala !== "nueva") return `dio escala ${p.escala}`;
    if (!casi(p.valor, 77.005)) return `dio ${p.valor}`;
    return p.visitas === 6 ? null : `dio ${p.visitas} visitas`;
  });

  chequear("solo el tramo anterior → único, escala anterior, 89,4 en 110", () => {
    const p = promedioAuditorias(ANTES_DEL_CORTE);
    if (p.tipo !== "unico") return `dio tipo ${p.tipo}`;
    if (p.escala !== "anterior") return `dio escala ${p.escala}`;
    if (!casi(p.valor, 89.4)) return `dio ${p.valor}`;
    return p.visitas === 110 ? null : `dio ${p.visitas} visitas`;
  });

  chequear("lista vacía → sin dato", () => {
    const p = promedioAuditorias([]);
    return p.tipo === "sin_dato" ? null : `dio tipo ${p.tipo}`;
  });
}

// ── Lo que no entra a ningún tramo ───────────────────────────────────────

function probarExclusiones() {
  console.log("Filas que no entran a ningún tramo");

  chequear("una fila sin score_pct no mueve el promedio ni cuenta", () => {
    const p = promedioAuditorias([...AGOSTO_2026, { audit_date: "2026-08-15", score_pct: null }]);
    if (p.tipo !== "unico") return `dio tipo ${p.tipo}`;
    if (!casi(p.valor, 77.005)) return `dio ${p.valor}`;
    return p.visitas === 6 ? null : `dio ${p.visitas} visitas`;
  });

  chequear("una fila sin fecha legible no se asigna a ninguna escala", () => {
    const p = promedioAuditorias([...AGOSTO_2026, { audit_date: null, score_pct: 50 }]);
    if (p.tipo !== "unico") return `dio tipo ${p.tipo}`;
    if (!casi(p.valor, 77.005)) return `dio ${p.valor}`;
    return p.visitas === 6 ? null : `dio ${p.visitas} visitas`;
  });

  chequear("solo filas de escala desconocida → sin dato", () => {
    const p = promedioAuditorias([
      { audit_date: null, score_pct: 90 },
      { audit_date: "", score_pct: 40 },
    ]);
    return p.tipo === "sin_dato" ? null : `dio tipo ${p.tipo}`;
  });
}

// ── La serie mensual del gráfico ─────────────────────────────────────────

function probarSerie() {
  console.log("serieAuditorias()");
  const s = serieAuditorias(TODAS);
  const valorDe = (mes: string) => s.valores[s.meses.indexOf(mes)];

  chequear("20 meses, de ene 2025 a ago 2026", () => {
    if (s.meses.length !== 20) return `dio ${s.meses.length} meses`;
    if (s.meses[0] !== "2025-01") return `empieza en ${s.meses[0]}`;
    return s.meses[19] === "2026-08" ? null : `termina en ${s.meses[19]}`;
  });

  chequear("los meses van del más viejo al más nuevo", () =>
    [...s.meses].sort().join() === s.meses.join() ? null : `dio ${s.meses.join(", ")}`,
  );

  chequear("marzo 2025, sin auditorías, queda en null", () => {
    if (s.meses[2] !== "2025-03") return `el tercer mes es ${s.meses[2]}`;
    return valorDe("2025-03") === null ? null : `dio ${valorDe("2025-03")}`;
  });

  chequear("agosto 2026 da 77,005", () =>
    casi(valorDe("2026-08") ?? null, 77.005) ? null : `dio ${valorDe("2026-08")}`,
  );
  chequear("julio 2026 da 86,4", () =>
    casi(valorDe("2026-07") ?? null, 86.4) ? null : `dio ${valorDe("2026-07")}`,
  );
  chequear("enero 2025 da 89,7", () =>
    casi(valorDe("2025-01") ?? null, 89.7) ? null : `dio ${valorDe("2025-01")}`,
  );

  chequear("lista vacía → serie vacía", () => {
    const vacia = serieAuditorias([]);
    return vacia.meses.length === 0 && vacia.valores.length === 0
      ? null
      : `dio ${vacia.meses.length} meses`;
  });

  chequear("una fila sin fecha legible no entra a la serie", () => {
    const conBasura = serieAuditorias([...AGOSTO_2026, { audit_date: null, score_pct: 10 }]);
    if (conBasura.meses.length !== 1) return `dio ${conBasura.meses.length} meses`;
    return casi(conBasura.valores[0], 77.005) ? null : `dio ${conBasura.valores[0]}`;
  });
}

console.log("CORTE METODOLÓGICO DE AUDITORÍAS · filas fijas\n");
probarEscala();
probarPromedio();
probarExclusiones();
probarSerie();
console.log(fallas ? `\n${fallas} chequeo(s) fallaron.` : "\nTodo da.");
process.exitCode = fallas ? 1 : 0;
