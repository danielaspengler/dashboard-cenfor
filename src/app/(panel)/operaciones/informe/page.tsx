import {
  getAuditorias,
  getMarcasYLocales,
  getUltimosSnapshots,
  getVisitas,
  type DimensionAuditoria,
} from "@/lib/data";
import {
  armarFilas,
  delMes,
  formatear,
  getIndicadores,
  getPuntosDeVenta,
  getValoresDelivery,
  valorDe,
  type FilaPunto,
  type IndicadorDef,
} from "@/lib/delivery";
import { calcularScore } from "@/lib/score";
import { MARCA, nivelAuditoria, nivelDe } from "@/lib/marca";
import { CANALES } from "@/lib/sync/fuentes";
import { type Busqueda, etiquetaMes, leerMes } from "@/lib/filtros";
import { FiltroMeses, FiltroOpciones } from "@/components/filtros";
import { PageHeader, SinDato, Tabla, Td, Th, Variacion } from "@/components/ui";
import { BotonImprimir } from "./imprimir";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────
// INFORME MENSUAL POR LOCAL
//
// El documento que hoy se arma a mano y se le entrega a cada sucursal. Tres
// hojas: el score con sus componentes, la visita y las apps, y las marcas que
// cocinan adentro del local.
//
// Lo que se ve en pantalla es lo que sale impreso: no hay una versión web y
// otra para el PDF. Lo único que cambia al imprimir es que desaparecen el
// menú, los filtros y el botón —eso lo hace `globals.css`— y que cada hoja
// arranca en página nueva.
//
// El informe SALE DEL HISTÓRICO DE LA BASE, nunca de lo que la planilla
// muestra hoy: la de auditorías guarda una sola auditoría por local y la pisa
// en cada visita nueva. El informe de agosto tiene que decir lo mismo dentro
// de seis meses.
// ─────────────────────────────────────────────────────────────────────────

/** Un bloque con título, de los que se numeran en el documento. */
function Bloque({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
          {titulo}
        </h2>
        {bajada && <p className="mt-1 pl-3 text-xs text-[var(--color-piedra)]">{bajada}</p>}
      </div>
      {children}
    </section>
  );
}

/** Una barra horizontal con el porcentaje adentro, para leer 9 filas de un vistazo. */
function Barra({ pct, color }: { pct: number | null; color: string }) {
  if (pct === null) return <SinDato>—</SinDato>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--color-nube)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums">{pct.toFixed(1)}%</span>
    </div>
  );
}

/** "a, b y c" — una lista escrita como se escribe en castellano, no con "y" repetida. */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** Las secciones de una visita de mystery shopper, ordenadas de peor a mejor. */
function seccionesDe(sections: Record<string, number> | null): [string, number][] {
  return Object.entries(sections ?? {}).sort((a, b) => a[1] - b[1]);
}

export default async function InformePage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const filtros = await searchParams;
  const [{ locales }, visitas, auditorias, snapshots, defs, puntosTodos, valoresTodos] =
    await Promise.all([
      getMarcasYLocales(),
      getVisitas(),
      getAuditorias(),
      getUltimosSnapshots(),
      getIndicadores(),
      getPuntosDeVenta(),
      getValoresDelivery(),
    ]);

  const elegido = Array.isArray(filtros.local) ? filtros.local[0] : filtros.local;
  const local = locales.find((l) => l.slug === elegido) ?? locales[0];

  // Los meses que ESTE local tiene cargados, en cualquiera de las tres
  // fuentes: un local sin visita pero con auditoría igual tiene informe.
  const suyoDelivery = puntosTodos.filter((p) => p.location_id === local?.id);
  const idsSuyos = new Set(suyoDelivery.map((p) => p.id));
  const meses = [
    ...new Set([
      ...visitas.filter((v) => v.location_id === local?.id).map((v) => v.visit_date?.slice(0, 7)),
      ...auditorias.filter((a) => a.location_id === local?.id).map((a) => a.audit_date.slice(0, 7)),
      ...valoresTodos
        .filter((v) => idsSuyos.has(v.delivery_point_id))
        .map((v) => v.period_start.slice(0, 7)),
    ]),
  ]
    .filter((m): m is string => Boolean(m))
    .sort()
    .reverse();
  const mes = leerMes(filtros.mes, meses);

  const marcaSlug = locales.find((l) => l.id === local?.id)?.marca === "Formaggio"
    ? "formaggio"
    : "censurado";

  const encabezado = (
    <PageHeader
      titulo="Informe por local"
      bajada="El documento que se le entrega a cada sucursal, con el historial de la base"
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <FiltroOpciones
            rotulo="Local"
            param="local"
            actual={local?.slug ?? ""}
            opciones={locales.map((l) => ({
              valor: l.slug,
              etiqueta: `${l.marca} · ${l.name}`,
            }))}
          />
          <FiltroMeses actual={mes} meses={meses} conTodo={false} />
          <BotonImprimir />
        </div>
      }
    />
  );

  if (!local || !meses.length) {
    return (
      <>
        {encabezado}
        <div className="p-7">
          <SinDato>
            {local
              ? `${local.name} no tiene ningún dato cargado todavía: sin visitas, sin auditorías y sin ventas por apps.`
              : "No hay locales cargados."}
          </SinDato>
        </div>
      </>
    );
  }

  // ── Los datos del mes ────────────────────────────────────────────────────
  const score = calcularScore({
    mes,
    marcaSlug,
    locationId: local.id,
    visitas,
    auditorias,
    snapshot: snapshots.get(local.id),
    puntos: puntosTodos,
    valores: valoresTodos,
    defs,
  });

  const visitasDelMes = visitas.filter(
    (v) => v.location_id === local.id && (v.visit_date ?? "").slice(0, 7) === mes,
  );
  const auditoria = auditorias
    .filter((a) => a.location_id === local.id && a.audit_date.slice(0, 7) === mes)
    .sort((a, b) => b.audit_date.localeCompare(a.audit_date))[0];
  const dimensiones: DimensionAuditoria[] = auditoria?.categories ?? [];

  const mesPrevio = meses[meses.indexOf(mes) + 1] ?? null;
  const filasDe = (m: string, conMarcaB: boolean) => {
    const puntos = suyoDelivery.filter((p) => (conMarcaB ? p.marcaB : !p.marcaB) && p.activo);
    const ids = new Set(puntos.map((p) => p.id));
    return armarFilas(
      delMes(
        valoresTodos.filter((v) => ids.has(v.delivery_point_id)),
        m,
      ),
      defs,
      puntos,
    );
  };
  const propias = filasDe(mes, false);
  const propiasPrevias = mesPrevio ? filasDe(mesPrevio, false) : [];
  const marcasB = filasDe(mes, true);
  const marcasBPrevias = mesPrevio ? filasDe(mesPrevio, true) : [];

  const nombreMesPrevio = mesPrevio ? etiquetaMes(mesPrevio).split(" ")[0].toLowerCase() : "";
  const colorMarca =
    MARCA.marcas[marcaSlug as keyof typeof MARCA.marcas]?.color ?? "var(--color-tinta)";

  /** Los indicadores destacados de una tienda, con su variación contra el mes anterior. */
  const indicadoresDe = (fila: FilaPunto, previas: FilaPunto[]) => {
    const previa = previas.find((p) => p.punto.id === fila.punto.id);
    return defs
      .filter((d) => d.channel === fila.punto.channel && d.destacado && d.unidad !== "texto")
      .map((d) => ({
        def: d,
        valor: valorDe(fila, d.clave),
        anterior: previa ? valorDe(previa, d.clave) : null,
      }))
      .filter((x) => x.valor !== null);
  };

  const tarjetaTienda = (fila: FilaPunto, previas: FilaPunto[]) => {
    const canal = CANALES.find((c) => c.id === fila.punto.channel)?.nombre ?? fila.punto.channel;
    return (
      <div
        key={fila.punto.id}
        className="break-inside-avoid rounded-xl border-2 border-[var(--color-borde)] p-4"
      >
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{fila.punto.name}</span>
          <span className="text-xs uppercase tracking-wide text-[var(--color-piedra)]">
            {canal}
          </span>
        </div>
        <dl className="space-y-1.5">
          {indicadoresDe(fila, previas).map(({ def, valor, anterior }) => (
            <div key={def.id} className="flex items-baseline justify-between gap-3 text-xs">
              <dt className="text-[var(--color-grafito)]">{def.nombre}</dt>
              <dd className="flex items-baseline gap-2 text-right">
                <span className="font-medium tabular-nums">{formatear(valor, def.unidad)}</span>
                {mesPrevio && (
                  <span className="text-[10px]">
                    <Variacion
                      delta={valor !== null && anterior !== null ? valor - anterior : null}
                      mejorSiBaja={def.mejor_si_baja}
                      escribir={
                        def.unidad === "pct"
                          ? undefined
                          : (n) => formatear(n, def.unidad) ?? String(n)
                      }
                      contra={nombreMesPrevio}
                    />
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  return (
    <>
      {encabezado}

      <article className="space-y-8 p-7 print:p-0">
        {/* ── Hoja 1: el score y sus componentes ───────────────────────── */}
        <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--color-tinta)] pb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-piedra)]">
              {local.marca}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {local.name} — informe de calidad
            </h1>
          </div>
          <p className="text-sm text-[var(--color-grafito)]">{etiquetaMes(mes)}</p>
        </header>

        <Bloque
          titulo="Score del local"
          bajada={`Los indicadores del tablero en un solo número. ${
            score.sinDato.length
              ? `Este mes falta ${enumerar(score.sinDato.map((e) => e.nombre.toLowerCase()))}: su peso se reparte entre los demás, no cuenta como cero.`
              : `Con ${score.ejes.length === 2 ? "los dos ejes" : "los cuatro ejes"} del modelo de ${local.marca} medidos.`
          }`}
        >
          <div className="flex flex-wrap items-center gap-6">
            <div
              className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-4"
              style={{ borderColor: colorMarca }}
            >
              <span className="text-3xl font-semibold tabular-nums">
                {score.valor === null ? "—" : score.valor.toFixed(2)}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--color-piedra)]">
                sobre 100
              </span>
            </div>
            <dl className="min-w-[280px] flex-1 space-y-2">
              {score.ejes.map((e) => (
                <div key={e.clave} className="flex items-center gap-3 text-sm">
                  <dt className="w-36 shrink-0">
                    {e.nombre}
                    <span className="ml-1 text-xs text-[var(--color-piedra)]">{e.peso}%</span>
                  </dt>
                  <dd className="flex-1">
                    {e.valor === null ? (
                      <SinDato>{e.detalle}</SinDato>
                    ) : (
                      <Barra pct={e.valor} color={colorMarca} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Bloque>

        {auditoria ? (
          <Bloque
            titulo="Resumen de auditoría"
            bajada={`Auditoría del ${auditoria.audit_date.slice(8, 10)}/${auditoria.audit_date.slice(5, 7)}${auditoria.auditor ? ` · ${auditoria.auditor}` : ""} · los cortes son los de la planilla: 95 se cumple totalmente, 90 mayoritariamente, 70 en buena parte, 50 en partes`}
          >
            <p className="text-3xl font-semibold tabular-nums">
              <span style={{ color: nivelAuditoria(auditoria.score_pct)?.color }}>
                {auditoria.score_pct?.toFixed(2)}%
              </span>
              <span className="ml-3 text-sm font-normal text-[var(--color-grafito)]">
                {nivelAuditoria(auditoria.score_pct)?.nombre}
              </span>
            </p>
            {dimensiones.length > 0 ? (
              <Tabla>
                <thead>
                  <tr>
                    <Th>Dimensión</Th>
                    <Th className="text-right">Peso</Th>
                    <Th>Alcanzado</Th>
                  </tr>
                </thead>
                <tbody>
                  {dimensiones.map((d) => (
                    <tr key={d.letra}>
                      <Td className="whitespace-nowrap font-medium">{d.nombre}</Td>
                      <Td className="text-right tabular-nums text-[var(--color-piedra)]">
                        {d.peso_pct === null ? "—" : `${d.peso_pct}%`}
                      </Td>
                      <Td>
                        <Barra pct={d.pct} color={nivelAuditoria(d.pct)?.color ?? colorMarca} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            ) : (
              <SinDato>
                Esta auditoría se guardó antes de que el sync leyera el desglose por dimensión.
                Entra sola en la próxima corrida.
              </SinDato>
            )}
          </Bloque>
        ) : (
          <Bloque titulo="Resumen de auditoría">
            <SinDato>
              {marcaSlug === "formaggio"
                ? "Formaggio no tiene auditoría presencial."
                : `Sin auditoría en ${etiquetaMes(mes).toLowerCase()}.`}
            </SinDato>
          </Bloque>
        )}

        {/* ── Hoja 2: la visita y las apps ─────────────────────────────── */}
        <div className="break-before-page space-y-8">
          <Bloque
            titulo="Resumen de mystery shopper"
            bajada={
              visitasDelMes.length
                ? "Las secciones van de la más floja a la más firme: la primera es lo accionable."
                : undefined
            }
          >
            {visitasDelMes.length === 0 ? (
              <SinDato>Sin visita en {etiquetaMes(mes).toLowerCase()}.</SinDato>
            ) : (
              visitasDelMes.map((v) => (
                <div key={v.id} className="space-y-3">
                  <p className="text-3xl font-semibold tabular-nums">
                    <span style={{ color: nivelDe(v.score_pct)?.color }}>
                      {v.score_pct?.toFixed(2)}%
                    </span>
                    <span className="ml-3 text-sm font-normal text-[var(--color-grafito)]">
                      {v.classification}
                      {v.experience_type === "delivery" ? " · delivery" : " · take away"}
                    </span>
                  </p>
                  <dl className="space-y-2">
                    {seccionesDe(v.sections).map(([nombre, pct]) => (
                      <div key={nombre} className="flex items-center gap-3 text-sm">
                        <dt className="w-52 shrink-0 text-[var(--color-grafito)]">{nombre}</dt>
                        <dd className="flex-1">
                          <Barra pct={pct} color={nivelDe(pct)?.color ?? colorMarca} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))
            )}
          </Bloque>

          <Bloque
            titulo={`Métricas operativas · ${local.marca}`}
            bajada={
              mesPrevio
                ? `Cada app mide su propia tienda; la variación es contra ${nombreMesPrevio}.`
                : "Cada app mide su propia tienda. Es el primer mes cargado: todavía no hay contra qué comparar."
            }
          >
            {propias.length === 0 ? (
              <SinDato>Este local no vende por apps.</SinDato>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {propias.map((f) => tarjetaTienda(f, propiasPrevias))}
              </div>
            )}
          </Bloque>
        </div>

        {/* ── Hoja 3: las marcas B y el plan de acción ─────────────────── */}
        <div className="break-before-page space-y-8">
          {marcasB.length > 0 && (
            <Bloque
              titulo="Otras marcas en este local"
              bajada="Cocinan adentro del local y se venden aparte en las apps. Sus números no entran en el score del local, pero salen de la misma cocina y del mismo equipo."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {marcasB.map((f) => tarjetaTienda(f, marcasBPrevias))}
              </div>
            </Bloque>
          )}

          <Bloque
            titulo="Plan de acción"
            bajada="Lo que hay que hacer este mes, con su responsable y su fecha."
          >
            <div className="rounded-xl border-2 border-dashed border-[var(--color-borde)] p-5">
              <SinDato>
                Todavía no se cargan desde el dashboard. Hasta que la sección Plan de acción esté
                lista, este bloque se completa a mano sobre el PDF impreso, igual que las
                recomendaciones de la auditora —que la planilla deja en blanco.
              </SinDato>
            </div>
          </Bloque>
        </div>

        <footer className="border-t border-[var(--color-borde)] pt-3 text-[10px] text-[var(--color-piedra)]">
          {local.marca} — {local.name} — documento de trabajo interno · {etiquetaMes(mes)} ·
          generado desde el tablero de {MARCA.nombre}
        </footer>
      </article>
    </>
  );
}
