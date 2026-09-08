import {
  agregar,
  armarFilas,
  delMes,
  formatear,
  getIndicadores,
  getMotivosDelivery,
  getPuntosDeVenta,
  getValoresDelivery,
  mesesConDatos,
  valorDe,
  type FilaPunto,
  type IndicadorDef,
  type MotivoDelivery,
} from "@/lib/delivery";
import { CANALES } from "@/lib/sync/fuentes";
import { type Busqueda, etiquetaMes, leerMes, mesAnterior } from "@/lib/filtros";
import { FiltroCanal, FiltroMeses } from "@/components/filtros";
import { Card, Dato, PageHeader, SinDato, Tabla, Td, Th, Variacion } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Motivos agrupados por motivo + detalle, del que más órdenes afecta al que menos. */
function agrupar(motivos: MotivoDelivery[]) {
  const mapa = new Map<
    string,
    { motivo: string; detalle: string; ordenes: number; puntos: Set<string> }
  >();
  for (const m of motivos) {
    const clave = `${m.motivo}||${m.detalle}`;
    const fila = mapa.get(clave) ?? {
      motivo: m.motivo,
      detalle: m.detalle,
      ordenes: 0,
      puntos: new Set<string>(),
    };
    fila.ordenes += m.cantidad_ordenes;
    fila.puntos.add(m.delivery_point_id);
    mapa.set(clave, fila);
  }
  return [...mapa.values()].sort((a, b) => b.ordenes - a.ordenes);
}

function leerCanal(valor: string | string[] | undefined): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return CANALES.some((c) => c.id === v) ? (v as string) : CANALES[0].id;
}

/**
 * Cómo está hecha la cuenta de este canal, dicho en la pantalla.
 *
 * Las tres apps permiten cuentas distintas y esconderlo haría comparables
 * números que no lo son. Sale del catálogo: si mañana una app empieza a
 * publicar la cantidad de evaluaciones, la nota cambia sola.
 */
function notaDeLaCuenta(defs: IndicadorDef[]): string {
  const ponderados = defs.filter((d) => d.pondera_con && d.destacado);
  const promediados = defs.filter(
    (d) => !d.pondera_con && d.destacado && (d.unidad === "pct" || d.unidad === "minutos"),
  );
  const partes: string[] = [];
  if (ponderados.length) {
    const nombres = ponderados.map((d) => d.nombre.toLowerCase()).join(" y ");
    partes.push(`La ${nombres} va ponderada por la cantidad de evaluaciones.`);
  }
  if (promediados.length) {
    partes.push(
      `Los porcentajes y tiempos son promedio simple de los puntos de venta: esta app no publica el total de pedidos de cada uno, así que no hay con qué ponderarlos.`,
    );
  }
  partes.push(
    "CENFOR todavía no definió umbrales para delivery, por eso ningún número está pintado de verde o rojo.",
  );
  return partes.join(" ");
}

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [defsTodos, puntosTodos, valoresTodos, motivosTodos] = await Promise.all([
    getIndicadores(),
    getPuntosDeVenta(),
    getValoresDelivery(),
    getMotivosDelivery(),
  ]);

  const canal = leerCanal(filtros.canal);
  const nombreCanal = CANALES.find((c) => c.id === canal)?.nombre ?? canal;
  const defs = defsTodos.filter((d) => d.channel === canal).sort((a, b) => a.orden - b.orden);
  const destacados = defs.filter((d) => d.destacado);
  const puntos = puntosTodos.filter((p) => p.channel === canal);
  const idsDelCanal = new Set(puntos.map((p) => p.id));

  const valores = valoresTodos.filter((v) => idsDelCanal.has(v.delivery_point_id));
  const meses = mesesConDatos(valores);
  const mes = leerMes(filtros.mes, meses);
  const previo = mesAnterior(mes, meses);
  const etiquetaPrevio = previo ? etiquetaMes(previo).split(" ")[0].toLowerCase() : "";

  // Un punto de venta cerrado —Alta Córdoba dejó de operar— tiene histórico
  // válido del período en que operó, pero no entra en los promedios del mes:
  // aparece con 0% de disponibilidad y hunde el número del grupo con una
  // tienda que ya no existe. Se saca de la cuenta y se dice cuál se sacó.
  const activos = puntos.filter((p) => p.activo);
  const partir = (fs: FilaPunto[]) => ({
    vivos: fs.filter((f) => f.punto.activo),
    cerrados: fs.filter((f) => !f.punto.activo),
  });

  const { vivos: filas, cerrados } = partir(armarFilas(delMes(valores, mes), defs, puntos));
  const filasPrevias = previo
    ? partir(armarFilas(delMes(valores, previo), defs, puntos)).vivos
    : [];

  // Ordenadas por el primer indicador del canal, de mayor a menor. En Rappi y
  // PedidosYa el primero es el porcentaje de reclamos, así que arriba queda lo
  // que más duele; en Uber es el volumen de pedidos, y arriba queda la tienda
  // más grande. En los dos casos es la fila que primero hay que mirar.
  const principal = defs[0];
  const ordenadas = [...filas].sort((a, b) => {
    const va = principal ? (valorDe(a, principal.clave) ?? -1) : -1;
    const vb = principal ? (valorDe(b, principal.clave) ?? -1) : -1;
    if (vb !== va) return vb - va;
    return a.punto.name.localeCompare(b.punto.name);
  });

  const motivosDelMes = delMes(motivosTodos, mes).filter((m) =>
    idsDelCanal.has(m.delivery_point_id),
  );
  const cierre = delMes(valores, mes)[0]?.period_end;

  const encabezado = (
    <PageHeader
      titulo="Delivery"
      bajada="Solo Censurado vende por app · la unidad es el punto de venta, no el local"
      extra={
        <div className="flex items-center gap-2">
          <FiltroCanal actual={canal} canales={[...CANALES]} />
          <FiltroMeses actual={mes} meses={meses} conTodo={false} />
        </div>
      }
    />
  );

  if (!meses.length) {
    return (
      <>
        {encabezado}
        <div className="p-7">
          <Card>
            <SinDato>
              Todavía no hay datos de {nombreCanal} cargados. Los trae el sync desde su planilla.
            </SinDato>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      {encabezado}

      <div className="space-y-8 p-7">
        <p className="text-xs text-[var(--color-piedra)]">
          <strong className="font-medium text-[var(--color-tinta)]">
            {nombreCanal} · {etiquetaMes(mes)}
          </strong>{" "}
          · {filas.length} de {activos.length} puntos de venta con datos
          {cierre && ` · cierre de la planilla al ${cierre.slice(8, 10)}/${cierre.slice(5, 7)}`}
          {cerrados.length > 0 && (
            <>
              {" · fuera de estos números: "}
              {cerrados.map((f) => f.punto.name).join(" · ")}, que ya no{" "}
              {cerrados.length === 1 ? "opera" : "operan"}
            </>
          )}
          .
        </p>

        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-5">
          {destacados.map((def) => {
            const actual = agregar(filas, def);
            const anterior = filasPrevias.length ? agregar(filasPrevias, def) : null;
            const esSuma = def.unidad === "conteo" || def.unidad === "pesos";
            return (
              <Card key={def.id}>
                <Dato
                  etiqueta={def.nombre}
                  valor={formatear(actual, def.unidad) ?? <SinDato>—</SinDato>}
                  detalle={esSuma ? "total del mes" : `promedio de ${filas.length} puntos`}
                />
                <div className="mt-1 text-xs">
                  <Variacion
                    delta={actual !== null && anterior !== null ? actual - anterior : null}
                    mejorSiBaja={def.mejor_si_baja}
                    // Un porcentaje varía en puntos porcentuales; lo demás
                    // varía en su propia unidad.
                    escribir={
                      def.unidad === "pct"
                        ? undefined
                        : (n) => formatear(n, def.unidad) ?? String(n)
                    }
                    contra={etiquetaPrevio}
                  />
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-[var(--color-piedra)]">{notaDeLaCuenta(defs)}</p>

        <section>
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
            Puntos de venta
          </h2>
          <p className="mb-3 text-xs text-[var(--color-piedra)]">
            Cada app mide su propia tienda: un mismo local aparece en los tres canales con
            números que no se comparan entre sí. Las marcas B —Lomos la Catedral, Burger Club,
            Woops— cocinan dentro de un local de Censurado y se venden aparte en las apps.
            {canal === "rappi" &&
              " Turbo es la tienda rápida de Rappi: es un punto de venta propio y no se suma al del local."}
          </p>
          <Tabla>
            <thead>
              <tr>
                <Th>Punto de venta</Th>
                <Th>Local</Th>
                {defs.map((d) => (
                  <Th key={d.id} className={d.unidad === "texto" ? "" : "text-right"}>
                    {d.nombre}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((f) => (
                <tr key={f.punto.id} className="hover:bg-[var(--color-hueso)]">
                  {/* El nombre del punto ya trae la marca B y el formato
                      ("Lomos la Catedral · Urca"): repetirlos al lado sería
                      decir dos veces lo mismo. */}
                  <Td className="whitespace-nowrap font-medium">{f.punto.name}</Td>
                  <Td className="whitespace-nowrap text-[var(--color-piedra)]">{f.punto.local}</Td>
                  {defs.map((d) => {
                    const celda = f.valores.get(d.clave);
                    const texto =
                      d.unidad === "texto"
                        ? (celda?.texto ?? null)
                        : formatear(celda?.valor ?? null, d.unidad);
                    return (
                      <Td
                        key={d.id}
                        className={
                          d.unidad === "texto"
                            ? "text-xs text-[var(--color-piedra)]"
                            : "whitespace-nowrap text-right tabular-nums"
                        }
                      >
                        {texto ?? <SinDato>—</SinDato>}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Tabla>
        </section>

        {/* Los motivos de reclamo son solo de Rappi. En los otros dos canales
            la sección no aparece vacía: no aparece. */}
        {motivosDelMes.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
              Motivos de reclamo
            </h2>
            <p className="mb-3 text-xs text-[var(--color-piedra)]">
              Cuando un mes tiene más de una carga en la planilla, se usa la más reciente, que
              incluye a la anterior. Agosto viene cargado dos veces —cerrado al 24 y al 31—:
              sumarlas contaría el mes casi dos veces.
            </p>
            <div className="grid gap-5 lg:grid-cols-2">
              {[
                { titulo: "Por orden", scope: "orden" as const },
                { titulo: "Por producto", scope: "producto" as const },
              ].map((bloque) => {
                const delBloque = agrupar(motivosDelMes.filter((m) => m.scope === bloque.scope));
                return (
                  <div key={bloque.titulo}>
                    <h3 className="mb-2 text-xs font-medium text-[var(--color-piedra)]">
                      {bloque.titulo}
                    </h3>
                    {delBloque.length === 0 ? (
                      <Card>
                        <SinDato>
                          Sin reclamos cargados en {etiquetaMes(mes).toLowerCase()}.
                        </SinDato>
                      </Card>
                    ) : (
                      <Tabla>
                        <thead>
                          <tr>
                            <Th>Motivo</Th>
                            <Th className="text-right">Órdenes</Th>
                            <Th className="text-right">Puntos</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {delBloque.slice(0, 8).map((f) => (
                            <tr
                              key={`${f.motivo}-${f.detalle}`}
                              className="hover:bg-[var(--color-hueso)]"
                            >
                              <Td>
                                <span className="font-medium">{f.motivo}</span>
                                {f.detalle && (
                                  <span className="ml-2 text-xs text-[var(--color-piedra)]">
                                    {f.detalle}
                                  </span>
                                )}
                              </Td>
                              <Td className="text-right tabular-nums">{f.ordenes}</Td>
                              <Td className="text-right tabular-nums text-[var(--color-piedra)]">
                                {f.puntos.size}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Tabla>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
