import {
  delMesFinanciero,
  getFinancieros,
  mesesFinancieros,
  pesos,
  pesosCortos,
  porcentaje,
  serieMensual,
  totalizar,
  variacion,
  type FilaFinanciera,
  type Indicador,
  type Medida,
  type Totales,
} from "@/lib/economico";
import { getMarcasYLocales, type Local } from "@/lib/data";
import { LOOKER_ECONOMICO } from "@/lib/sync/fuentes";
import {
  LOCAL_TODOS,
  type Busqueda,
  etiquetaMes,
  leerLocal,
  leerMes,
  mesAnterior,
} from "@/lib/filtros";
import { FiltroMeses, FiltroOpciones } from "@/components/filtros";
import { Card, Dato, PageHeader, SinDato, Tabla, Td, Th, Variacion } from "@/components/ui";
import { GraficoBarras, GraficoLinea, Leyenda, extremos, type Serie } from "@/components/graficos";

export const dynamic = "force-dynamic";

type Formato = (v: number) => string;
type TarjetaDef = { indicador: Indicador; etiqueta: string; formato: Formato; enPuntos: boolean };
type Contexto = {
  filasMes: FilaFinanciera[];
  filasPrevio: FilaFinanciera[];
  previo: string | null;
  totales: Totales;
  totalesPrevio: Totales;
  nombre: (id: string) => string;
  conLocal: boolean;
};

const decimales = (n: number) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: n, maximumFractionDigits: n });
const entero: Formato = (v) => decimales(0).format(v);
const pesosCorto: Formato = (v) => pesosCortos(v) ?? "";
const pesosLargo: Formato = (v) => pesos(v) ?? "";
const pct: Formato = (v) => porcentaje(v) ?? "";
const puntos: Formato = (v) => `${decimales(1).format(v)} pts`;

const VOLUMEN: TarjetaDef[] = [
  { indicador: "ventas", etiqueta: "Ventas", formato: pesosCorto, enPuntos: false },
  { indicador: "ordenes", etiqueta: "Órdenes", formato: entero, enPuntos: false },
  { indicador: "ticket", etiqueta: "Ticket promedio", formato: pesosLargo, enPuntos: false },
];

const PORCENTAJES: TarjetaDef[] = [
  { indicador: "costos_fijos_pct", etiqueta: "% costos fijos", formato: pct, enPuntos: true },
  { indicador: "costos_variables_pct", etiqueta: "% costos variables", formato: pct, enPuntos: true },
  { indicador: "compras_ventas_pct", etiqueta: "Compras/ventas", formato: pct, enPuntos: true },
  { indicador: "rentabilidad_neta_pct", etiqueta: "Rentabilidad neta", formato: pct, enPuntos: true },
];

const CLASE_TITULO =
  "border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]";

/** "General Paz y Poeta Lugones". Copia de la del informe: son cuatro líneas. */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** "enero a mayo 2025", "noviembre 2025 a febrero 2026", "julio 2026". */
function tramo(desde: string, hasta: string): string {
  const [md, ad] = etiquetaMes(desde).toLowerCase().split(" ");
  const [mh, ah] = etiquetaMes(hasta).toLowerCase().split(" ");
  if (desde === hasta) return `${md} ${ad}`;
  return ad === ah ? `${md} a ${mh} ${ah}` : `${md} ${ad} a ${mh} ${ah}`;
}

/** Los meses sin dato de una serie, agrupados en tramos seguidos. `null` si no falta ninguno. */
function mesesSinDato(meses: string[], valores: (number | null)[]): string | null {
  const tramos: [string, string][] = [];
  meses.forEach((m, i) => {
    if (valores[i] !== null) return;
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && i > 0 && valores[i - 1] === null) ultimo[1] = m;
    else tramos.push([m, m]);
  });
  return tramos.length ? enumerar(tramos.map(([d, h]) => tramo(d, h))) : null;
}

/** Con dos series, si les faltan meses distintos se dice de cuál es cada hueco. */
function sinDatoDe(meses: string[], series: Serie[]): string | null {
  // Sin un solo valor, el gráfico ya dice «sin dato» en lugar de los ejes:
  // repetirlo abajo con la lista de los trece meses es decir dos veces lo mismo.
  if (series.every((s) => s.valores.every((v) => v === null))) return null;
  const textos = series.map((s) => mesesSinDato(meses, s.valores));
  if (textos.every((t) => t === textos[0])) return textos[0];
  return series
    .flatMap((s, k) => (textos[k] ? [`${s.nombre.toLowerCase()} en ${textos[k]}`] : []))
    .join(" · ");
}

/** «4 de 6 locales · sin dato en General Paz y Poeta Lugones». Con un local elegido, nada. */
function cobertura(m: Medida, ctx: Contexto): string | undefined {
  if (ctx.conLocal || !m.conDato.length) return undefined;
  const base = `${m.conDato.length} de ${ctx.totales.locales.length} locales`;
  return m.sinDato.length ? `${base} · sin dato en ${enumerar(m.sinDato.map(ctx.nombre))}` : base;
}

function Tarjeta({ def, ctx }: { def: TarjetaDef; ctx: Contexto }) {
  const m = ctx.totales[def.indicador];
  const v = ctx.previo ? variacion(ctx.filasMes, ctx.filasPrevio, def.indicador) : null;
  const mesPrevio = ctx.previo ? etiquetaMes(ctx.previo).split(" ")[0].toLowerCase() : "";
  // La variación compara solo locales con el dato en los dos meses: si deja
  // afuera a alguno de cualquiera de los dos, se dice. Órdenes de agosto tiene
  // 4 locales y julio 6: la comparación es sobre los mismos 4.
  const conDatoPrevio = ctx.totalesPrevio[def.indicador].conDato.length;
  let mismos = "";
  if (v && v.locales.length < Math.max(m.conDato.length, conDatoPrevio))
    mismos = v.locales.length === 1 ? ", mismo local" : `, mismos ${v.locales.length} locales`;

  return (
    <Card>
      <Dato
        etiqueta={def.etiqueta}
        valor={m.valor === null ? <SinDato>sin dato</SinDato> : def.formato(m.valor)}
        detalle={cobertura(m, ctx)}
      />
      <div className="mt-1 text-xs">
        <Variacion
          neutra
          delta={v?.delta ?? null}
          escribir={def.enPuntos ? puntos : pct}
          contra={`${mesPrevio}${mismos}`}
        />
      </div>
    </Card>
  );
}

function Bloque({
  titulo,
  extra,
  sinDato,
  children,
}: {
  titulo: string;
  extra?: React.ReactNode;
  sinDato: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={CLASE_TITULO}>{titulo}</h2>
        {extra}
      </div>
      <Card>{children}</Card>
      {sinDato && <p className="mt-2 text-xs text-[var(--color-piedra)]">Sin dato: {sinDato}.</p>}
    </section>
  );
}

/** Ventas y ticket, costos y compras: los 13 meses que terminan en el elegido. */
function Evolucion({
  filas,
  mes,
  nombre,
}: {
  filas: FilaFinanciera[];
  mes: string;
  nombre: (id: string) => string;
}) {
  const serie = serieMensual(filas, mes);
  const meses = serie.map((p) => p.mes);
  const de = (i: Indicador) => serie.map((p) => p.totales[i].valor);
  const ventas: Serie = { nombre: "Ventas", valores: de("ventas") };
  const ticket: Serie = { nombre: "Ticket", valores: de("ticket") };
  const costos: Serie[] = [
    { nombre: "Fijos", valores: de("costos_fijos_pct") },
    { nombre: "Variables", valores: de("costos_variables_pct") },
  ];
  const compras: Serie = { nombre: "Compras/ventas", valores: de("compras_ventas_pct") };
  const rotulo = "mb-1 text-xs font-medium text-[var(--color-grafito)]";

  return (
    <>
      <Bloque titulo="Ventas y ticket promedio" sinDato={sinDatoDe(meses, [ventas, ticket])}>
        <h3 className={rotulo}>Ventas</h3>
        <GraficoBarras titulo="Ventas por mes" meses={meses} series={[ventas]} formato={pesosCorto} marcado={mes} />
        <h3 className={`${rotulo} mt-4`}>Ticket promedio</h3>
        <GraficoLinea titulo="Ticket promedio por mes" meses={meses} valores={ticket.valores} formato={pesosLargo} marcado={mes} />
      </Bloque>
      <div className="grid gap-8 lg:grid-cols-2">
        <Bloque titulo="Costos fijos y variables" extra={<Leyenda series={costos} />} sinDato={sinDatoDe(meses, costos)}>
          <GraficoBarras titulo="Costos fijos y variables sobre ventas, por mes" meses={meses} series={costos} formato={pct} marcado={mes} />
        </Bloque>
        <Bloque titulo="Compras sobre ventas" sinDato={sinDatoDe(meses, [compras])}>
          <GraficoBarras titulo="Compras sobre ventas, por mes" meses={meses} series={[compras]} formato={pct} marcado={mes} />
        </Bloque>
      </div>
      <RentabilidadPorLocal filas={filas} meses={meses} mes={mes} nombre={nombre} />
    </>
  );
}

/**
 * Un gráfico chico por local, todos con la misma escala. Seis líneas en un
 * mismo gráfico pedirían seis colores que la marca no tiene, y se pisarían.
 */
function RentabilidadPorLocal({
  filas,
  meses,
  mes,
  nombre,
}: {
  filas: FilaFinanciera[];
  meses: string[];
  mes: string;
  nombre: (id: string) => string;
}) {
  // Todos sobre los mismos meses que los otros gráficos, para que un mes caiga
  // en la misma columna en los seis.
  const series = [...new Set(filas.map((f) => f.location_id ?? ""))]
    .map((id) => {
      const delLocal = filas.filter((f) => (f.location_id ?? "") === id);
      const valores = meses.map(
        (m) => totalizar(delMesFinanciero(delLocal, m)).rentabilidad_neta_pct.valor,
      );
      return { id, nombre: nombre(id), valores };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const dominio = extremos(series.flatMap((s) => s.valores));
  const chico = series.length > 1;

  return (
    <section>
      <h2 className={`${CLASE_TITULO} mb-3`}>Rentabilidad neta por local</h2>
      <div className={chico ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : ""}>
        {series.map((s) => {
          // Por `sinDatoDe` y no por `mesesSinDato` directo: es la misma regla
          // que los otros bloques, así el gráfico vacío no dice «sin dato» y
          // debajo repite los trece meses uno por uno.
          const faltan = sinDatoDe(meses, [{ nombre: s.nombre, valores: s.valores }]);
          return (
            <Card key={s.id}>
              <h3 className="mb-1 text-xs font-medium text-[var(--color-grafito)]">{s.nombre}</h3>
              <GraficoLinea
                titulo={`Rentabilidad neta de ${s.nombre}, por mes`}
                meses={meses}
                valores={s.valores}
                formato={pct}
                marcado={mes}
                dominio={dominio}
                chico={chico}
                alto={chico ? 180 : 160}
              />
              {faltan && <p className="mt-1 text-xs text-[var(--color-piedra)]">Sin dato: {faltan}.</p>}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

const COLUMNAS: { indicador: Indicador; etiqueta: string; formato: Formato }[] = [
  { indicador: "ventas", etiqueta: "Ventas", formato: pesosLargo },
  { indicador: "ordenes", etiqueta: "Órdenes", formato: entero },
  { indicador: "ticket", etiqueta: "Ticket", formato: pesosLargo },
  { indicador: "costos_fijos_pct", etiqueta: "% fijos", formato: pct },
  { indicador: "costos_variables_pct", etiqueta: "% variables", formato: pct },
  { indicador: "compras_ventas_pct", etiqueta: "Compras/ventas", formato: pct },
  { indicador: "rentabilidad_neta_pct", etiqueta: "Rentabilidad", formato: pct },
];

/** Una fila por local, de la que más vende a la que menos. Cada celda pasa por la misma regla de sin dato. */
function TablaDelMes({ ctx, mes }: { ctx: Contexto; mes: string }) {
  const filas = ctx.filasMes
    .map((f) => ({ id: f.location_id ?? "", ventas: f.ventas ?? 0, totales: totalizar([f]) }))
    .sort((a, b) => b.ventas - a.ventas);
  return (
    <section>
      <h2 className={`${CLASE_TITULO} mb-3`}>Por local · {etiquetaMes(mes)}</h2>
      <Tabla>
        <thead>
          <tr>
            <Th>Local</Th>
            {COLUMNAS.map((c) => (
              <Th key={c.indicador} className="text-right">
                {c.etiqueta}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="hover:bg-[var(--color-hueso)]">
              <Td className="whitespace-nowrap font-medium">{ctx.nombre(f.id)}</Td>
              {COLUMNAS.map((c) => {
                const v = f.totales[c.indicador].valor;
                return (
                  <Td key={c.indicador} className="whitespace-nowrap text-right tabular-nums">
                    {v === null ? <SinDato>sin dato</SinDato> : c.formato(v)}
                  </Td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Tabla>
    </section>
  );
}

/** «Luuma (Censurado) · Nueva Córdoba, Tejeda y Villa Allende (Formaggio)». Nueva Córdoba existe en las dos marcas. */
function porMarca(locales: Local[]): string {
  const grupos = new Map<string, string[]>();
  for (const l of locales) grupos.set(l.marca, [...(grupos.get(l.marca) ?? []), l.name]);
  return [...grupos].map(([marca, nombres]) => `${enumerar(nombres)} (${marca})`).join(" · ");
}

function LineaDeContexto({ titulo, ctx, sinDatos }: { titulo: string; ctx: Contexto; sinDatos: Local[] }) {
  const n = ctx.totales.locales.length;
  return (
    <p className="text-xs text-[var(--color-piedra)]">
      <strong className="font-medium text-[var(--color-tinta)]">{titulo}</strong>
      {!ctx.conLocal && ` · ${n} ${n === 1 ? "local" : "locales"} con datos.`}
      {!ctx.conLocal && sinDatos.length > 0 && ` Sin datos económicos: ${porMarca(sinDatos)}.`}
    </p>
  );
}

function Encabezado({ local, conDatos, mes, meses }: { local: string; conDatos: Local[]; mes: string; meses: string[] }) {
  const opciones = [
    { valor: LOCAL_TODOS, etiqueta: "Todos los locales" },
    ...conDatos.map((l) => ({ valor: l.slug, etiqueta: l.name })),
  ];
  return (
    <PageHeader
      titulo="Resumen administrativo"
      bajada="Ventas, costos y rentabilidad de cada local, por mes"
      extra={
        <div className="flex items-center gap-2">
          <FiltroOpciones rotulo="Local" param="local" actual={local} opciones={opciones} porDefecto={LOCAL_TODOS} />
          <FiltroMeses actual={mes} meses={meses} conTodo={false} />
        </div>
      }
    />
  );
}

export default async function ResumenAdministrativoPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const filtros = await searchParams;
  const [todas, { locales: activos }] = await Promise.all([getFinancieros(), getMarcasYLocales()]);

  // Solo se ofrecen locales con alguna fila: Luuma y Formaggio no tienen datos
  // económicos y elegirlos abriría una pantalla vacía.
  const ids = new Set(todas.map((f) => f.location_id ?? ""));
  const conDatos = activos.filter((l) => ids.has(l.id));
  const local = leerLocal(filtros.local, conDatos.map((l) => l.slug));
  const elegido = conDatos.find((l) => l.slug === local);
  const visibles = elegido ? todas.filter((f) => f.location_id === elegido.id) : todas;

  // Los meses salen de lo filtrado: Poeta Lugones ofrece solo julio y agosto 2026.
  const meses = mesesFinancieros(visibles);
  const mes = leerMes(filtros.mes, meses);
  const previo = mesAnterior(mes, meses);
  const nombres = new Map(activos.map((l) => [l.id, l.name]));
  const filasMes = delMesFinanciero(visibles, mes);
  const filasPrevio = previo ? delMesFinanciero(visibles, previo) : [];
  const ctx: Contexto = {
    filasMes,
    filasPrevio,
    previo,
    totales: totalizar(filasMes),
    totalesPrevio: totalizar(filasPrevio),
    nombre: (id) => nombres.get(id) ?? "local sin nombre",
    conLocal: Boolean(elegido),
  };
  return (
    <>
      <Encabezado local={local} conDatos={conDatos} mes={mes} meses={meses} />
      {todas.length ? (
        <Cuerpo
          ctx={ctx}
          titulo={`${elegido ? elegido.name : "Todos los locales"} · ${etiquetaMes(mes)}`}
          sinDatos={activos.filter((l) => !ids.has(l.id))}
          visibles={visibles}
          mes={mes}
        />
      ) : (
        <div className="p-7">
          <Card>
            <SinDato>Todavía no hay datos económicos cargados. Los trae el sync desde la planilla.</SinDato>
          </Card>
        </div>
      )}
    </>
  );
}

function Cuerpo({
  ctx,
  titulo,
  sinDatos,
  visibles,
  mes,
}: {
  ctx: Contexto;
  titulo: string;
  sinDatos: Local[];
  visibles: FilaFinanciera[];
  mes: string;
}) {
  return (
    <div className="space-y-8 p-7">
      <LineaDeContexto titulo={titulo} ctx={ctx} sinDatos={sinDatos} />
      <div className="grid gap-5 md:grid-cols-3">
        {VOLUMEN.map((d) => <Tarjeta key={d.indicador} def={d} ctx={ctx} />)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PORCENTAJES.map((d) => <Tarjeta key={d.indicador} def={d} ctx={ctx} />)}
      </div>
      <p className="text-xs text-[var(--color-piedra)]">
        Porcentajes ponderados por las ventas de cada local, solo del mes elegido. No coinciden con el
        Looker «{LOOKER_ECONOMICO}», que promedia los locales sin ponderar y mezcla períodos.
      </p>
      <Evolucion filas={visibles} mes={mes} nombre={ctx.nombre} />
      {/* Con un local elegido la tabla tendría una fila: ya lo dicen las tarjetas. */}
      {!ctx.conLocal && <TablaDelMes ctx={ctx} mes={mes} />}
    </div>
  );
}
