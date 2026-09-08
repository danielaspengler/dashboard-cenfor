import {
  delMes,
  getMetricasDelivery,
  getMotivosDelivery,
  getPuntosDeVenta,
  mesesConDatos,
  resumirDelivery,
  type MetricaDelivery,
  type MotivoDelivery,
} from "@/lib/data";
import { type Busqueda, etiquetaMes, leerMes, mesAnterior } from "@/lib/filtros";
import { FiltroMes } from "@/components/filtros";
import {
  Card,
  Dato,
  PageHeader,
  Pct,
  SinDato,
  Tabla,
  Td,
  Th,
  Variacion,
  pesos,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/** Motivos del mes agrupados por motivo + detalle, del que más órdenes afecta al que menos. */
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

function delta(actual: number | null, previo: number | null): number | null {
  return actual === null || previo === null ? null : actual - previo;
}

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [puntos, todasLasMetricas, todosLosMotivos] = await Promise.all([
    getPuntosDeVenta(),
    getMetricasDelivery(),
    getMotivosDelivery(),
  ]);

  const meses = mesesConDatos(todasLasMetricas);
  const mes = leerMes(filtros.mes, meses);
  const previo = mesAnterior(mes, meses);

  const puntoPorId = new Map(puntos.map((p) => [p.id, p]));
  const activos = puntos.filter((p) => p.activo);

  // Un punto de venta cerrado —Alta Córdoba dejó de operar— tiene histórico
  // válido del período en que operó, pero no entra en los promedios del mes:
  // aparece con 0% de disponibilidad y hunde el número del grupo con una
  // tienda que ya no existe. Se saca de la cuenta y se dice cuál se sacó.
  const enActivo = (m: { delivery_point_id: string }) =>
    puntoPorId.get(m.delivery_point_id)?.activo ?? false;

  const delMesTodas = delMes(todasLasMetricas, mes);
  const metricas = delMesTodas.filter(enActivo);
  const cerrados = delMesTodas.filter((m) => !enActivo(m));
  const motivos = delMes(todosLosMotivos, mes).filter(enActivo);
  const resumen = resumirDelivery(metricas);
  const resumenPrevio = previo
    ? resumirDelivery(delMes(todasLasMetricas, previo).filter(enActivo))
    : null;
  const etiquetaPrevio = previo ? etiquetaMes(previo).split(" ")[0].toLowerCase() : "";
  // Ordenado por reclamos: la pantalla existe para encontrar dónde duele, no
  // para listar los puntos de venta alfabéticamente.
  const filas = [...metricas].sort((a, b) => {
    const ra = a.reclamos_pct ?? -1;
    const rb = b.reclamos_pct ?? -1;
    if (rb !== ra) return rb - ra;
    return (puntoPorId.get(a.delivery_point_id)?.name ?? "").localeCompare(
      puntoPorId.get(b.delivery_point_id)?.name ?? "",
    );
  });

  const cierre = metricas[0]?.period_end;
  const motivosPorOrden = agrupar(motivos.filter((m) => m.scope === "orden"));
  const motivosPorProducto = agrupar(motivos.filter((m) => m.scope === "producto"));

  if (!meses.length) {
    return (
      <>
        <PageHeader titulo="Delivery" bajada="Rappi · solo Censurado opera delivery" />
        <div className="p-7">
          <Card>
            <SinDato>
              Todavía no hay datos de delivery cargados. Los trae el sync desde la planilla de
              Rappi.
            </SinDato>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Delivery"
        bajada="Rappi · solo Censurado opera delivery · la unidad es el punto de venta, no el local"
        extra={<FiltroMes actual={mes} meses={meses} />}
      />

      <div className="space-y-8 p-7">
        <p className="text-xs text-[var(--color-piedra)]">
          <strong className="font-medium text-[var(--color-tinta)]">{etiquetaMes(mes)}</strong> ·{" "}
          {resumen.puntos} de {activos.length} puntos de venta con datos
          {cierre && ` · cierre de la planilla al ${cierre.slice(8, 10)}/${cierre.slice(5, 7)}`} ·
          PedidosYa y Uber todavía no están conectados.
          {cerrados.length > 0 && (
            <>
              {" "}
              Fuera de estos números:{" "}
              {cerrados
                .map((m) => puntoPorId.get(m.delivery_point_id)?.name ?? "sin identificar")
                .join(" · ")}
              , que ya no {cerrados.length === 1 ? "opera" : "operan"}.
            </>
          )}
        </p>

        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-5">
          <Card>
            <Dato
              etiqueta="Calificación"
              valor={
                resumen.calificacion !== null ? (
                  `${resumen.calificacion.toFixed(2)} ★`
                ) : (
                  <SinDato>—</SinDato>
                )
              }
              detalle={
                resumen.resenas
                  ? `ponderada sobre ${resumen.resenas} reseñas`
                  : "sin reseñas en el mes"
              }
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Reclamos"
              valor={<Pct valor={resumen.reclamos} />}
              detalle={`${resumen.ordenesConReclamos} órdenes con reclamo`}
            />
            <div className="mt-1 text-xs">
              <Variacion
                delta={delta(resumen.reclamos, resumenPrevio?.reclamos ?? null)}
                mejorSiBaja
                contra={etiquetaPrevio}
              />
            </div>
          </Card>
          <Card>
            <Dato
              etiqueta="Cancelaciones"
              valor={<Pct valor={resumen.cancelaciones} />}
              detalle={`${resumen.ordenesCanceladas} órdenes canceladas`}
            />
            <div className="mt-1 text-xs">
              <Variacion
                delta={delta(resumen.cancelaciones, resumenPrevio?.cancelaciones ?? null)}
                mejorSiBaja
                contra={etiquetaPrevio}
              />
            </div>
          </Card>
          <Card>
            <Dato etiqueta="Órdenes con demora" valor={<Pct valor={resumen.demora} />} />
            <div className="mt-1 text-xs">
              <Variacion
                delta={delta(resumen.demora, resumenPrevio?.demora ?? null)}
                mejorSiBaja
                contra={etiquetaPrevio}
              />
            </div>
          </Card>
          <Card>
            <Dato
              etiqueta="Disponibilidad"
              valor={<Pct valor={resumen.disponibilidad} />}
              detalle={`compensado: ${pesos(resumen.compensacion)}`}
            />
            <div className="mt-1 text-xs">
              <Variacion
                delta={delta(resumen.disponibilidad, resumenPrevio?.disponibilidad ?? null)}
                contra={etiquetaPrevio}
              />
            </div>
          </Card>
        </div>

        <p className="text-xs text-[var(--color-piedra)]">
          La calificación va ponderada por cantidad de reseñas. Los porcentajes son promedio
          simple de los puntos de venta: la planilla de Rappi no trae el total de órdenes de cada
          uno, así que no hay con qué ponderarlos. CENFOR todavía no definió umbrales para
          delivery, por eso ningún número está pintado de verde o rojo.
        </p>

        <section>
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
            Puntos de venta
          </h2>
          <p className="mb-3 text-xs text-[var(--color-piedra)]">
            Ordenados por porcentaje de reclamos. Las marcas B —Lomos la Catedral, Burger Club,
            Woops— cocinan dentro de un local de Censurado y se venden aparte en la app. Turbo es
            la tienda rápida de Rappi: es un punto de venta propio y no se suma al del local.
          </p>
          <Tabla>
            <thead>
              <tr>
                <Th>Punto de venta</Th>
                <Th>Local</Th>
                <Th className="text-right">Calificación</Th>
                <Th className="text-right">Reclamos</Th>
                <Th className="text-right">Cancelaciones</Th>
                <Th className="text-right">Demora</Th>
                <Th className="text-right">Disponibilidad</Th>
                <Th className="text-right">Compensado</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m: MetricaDelivery) => {
                const punto = puntoPorId.get(m.delivery_point_id);
                return (
                  <tr key={m.delivery_point_id} className="hover:bg-[var(--color-hueso)]">
                    {/* El nombre del punto ya trae la marca B y el formato
                        ("Lomos la Catedral · Urca · Turbo"): repetirlos en una
                        etiqueta al lado sería decir dos veces lo mismo. */}
                    <Td className="font-medium">{punto?.name ?? <SinDato>—</SinDato>}</Td>
                    <Td className="text-[var(--color-piedra)]">{punto?.local}</Td>
                    <Td className="text-right tabular-nums">
                      {m.calificacion_promedio !== null ? (
                        <>
                          {m.calificacion_promedio.toFixed(2)} ★
                          <span className="ml-1 text-xs text-[var(--color-piedra)]">
                            ({m.cantidad_resenas})
                          </span>
                        </>
                      ) : (
                        <SinDato>sin reseñas</SinDato>
                      )}
                    </Td>
                    <Td className="text-right">
                      <Pct valor={m.reclamos_pct} />
                      {!!m.ordenes_con_reclamos && (
                        <span className="ml-1 text-xs text-[var(--color-piedra)]">
                          ({m.ordenes_con_reclamos})
                        </span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <Pct valor={m.cancelaciones_pct} />
                    </Td>
                    <Td className="text-right">
                      <Pct valor={m.ordenes_con_demora_pct} />
                    </Td>
                    <Td className="text-right">
                      <Pct valor={m.disponibilidad_pct} />
                    </Td>
                    <Td className="text-right tabular-nums">{pesos(m.compensacion_pagada)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </section>

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
              { titulo: "Por orden", filas: motivosPorOrden },
              { titulo: "Por producto", filas: motivosPorProducto },
            ].map((bloque) => (
              <div key={bloque.titulo}>
                <h3 className="mb-2 text-xs font-medium text-[var(--color-piedra)]">
                  {bloque.titulo}
                </h3>
                {bloque.filas.length === 0 ? (
                  <Card>
                    <SinDato>Sin reclamos cargados en {etiquetaMes(mes).toLowerCase()}.</SinDato>
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
                      {bloque.filas.slice(0, 8).map((f) => (
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
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
