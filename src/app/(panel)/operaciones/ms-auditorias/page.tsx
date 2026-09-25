import {
  getAuditorias,
  getLocalesCerrados,
  getMarcasYLocales,
  getVisitas,
  promedioValido,
  type AuditoriaFila,
} from "@/lib/data";
import { MES_CORTE, escalaAuditoria, nivelAuditoria, nivelDe } from "@/lib/marca";
import { esDelLooker, serieAuditorias, tieneFechaEstimada } from "@/lib/auditorias";
import { type Busqueda, enMes, etiquetaMes, leerMesFiltro, mesesDeFechas } from "@/lib/filtros";
import { FiltroMeses } from "@/components/filtros";
import { GraficoLinea } from "@/components/graficos";
import {
  Card,
  Dato,
  EnRevision,
  PageHeader,
  Puntaje,
  SinDato,
  Tabla,
  Td,
  Th,
  fechaCorta,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/** El mes del corte escrito como lo lee una persona: "agosto 2026". */
const MES_DEL_CORTE = etiquetaMes(MES_CORTE).toLowerCase();

/**
 * Con qué planilla se midieron las auditorías que la tarjeta cuenta.
 *
 * La tarjeta cuenta, no promedia, así que el corte no le rompe ningún número.
 * Lo que hace falta es decir que las que cuenta no se comparan entre sí cuando
 * vienen de los dos lados.
 */
function repartoPorPlanilla(auditorias: AuditoriaFila[]): string {
  if (!auditorias.length) return "solo Censurado";
  const nuevas = auditorias.filter((a) => escalaAuditoria(a.audit_date) === "nueva").length;
  const anteriores = auditorias.filter((a) => escalaAuditoria(a.audit_date) === "anterior").length;
  if (nuevas && anteriores) return `${nuevas} con la planilla nueva · ${anteriores} con la anterior`;
  if (nuevas) return "todas con la planilla nueva";
  if (anteriores) return "todas con la planilla anterior";
  return "sin fecha legible";
}

export default async function MsAuditoriasPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [{ locales }, todasLasVisitas, todasLasAuditorias, cerrados] = await Promise.all([
    getMarcasYLocales(),
    getVisitas(),
    getAuditorias(),
    getLocalesCerrados(),
  ]);

  // Los meses que ofrece el filtro salen de las DOS fuentes de la pantalla:
  // una visita de un mes sin auditorías igual tiene que poder mirarse.
  const meses = mesesDeFechas([
    ...todasLasVisitas.map((v) => v.visit_date),
    ...todasLasAuditorias.map((a) => a.audit_date),
  ]);
  const mes = leerMesFiltro(filtros.mes, meses);
  const visitas = todasLasVisitas.filter((v) => enMes(v.visit_date, mes));
  const auditorias = todasLasAuditorias.filter((a) => enMes(a.audit_date, mes));

  const localPorId = new Map(locales.map((l) => [l.id, l]));
  // Alta Córdoba cerró, pero sus auditorías de 2025 siguen en el histórico.
  const cerradoPorId = new Map(cerrados.map((l) => [l.id, l.name]));
  // Las dos experiencias del formulario viven acá, pero NO se promedian
  // juntas: un pedido por delivery y una visita al salón no miden lo mismo.
  // (La sección Delivery muestra los indicadores de las apps —Rappi—, que son
  // otra fuente: no tiene nada que ver con estas visitas.)
  const takeAway = visitas.filter((v) => v.experience_type === "take_away");
  const deliveryMS = visitas.filter((v) => v.experience_type === "delivery");
  const enRevision = visitas.filter((v) => v.needs_review).length;

  // La serie sale de TODAS las auditorías, sin el filtro de mes: una serie de
  // un solo mes no es una serie. El filtro marca el mes elegido, nada más.
  // Los locales cerrados se listan pero no entran al promedio de la serie.
  const serie = serieAuditorias(
    todasLasAuditorias.filter((a) => !(a.location_id && cerradoPorId.has(a.location_id))),
  );

  return (
    <>
      <PageHeader
        titulo="Mystery Shopper y Auditorías"
        bajada={`Puntajes calculados por las planillas del cliente · mystery shopper ≥90 excelente, ≥75 bueno, ≥60 regular. Desde ${MES_DEL_CORTE} la planilla de auditoría puntúa más exigente: 85 o más cumple. Los puntajes anteriores no se comparan con los nuevos.`}
        extra={<FiltroMeses actual={mes} meses={meses} />}
      />

      <div className="space-y-8 p-7">
        <div className="grid gap-5 md:grid-cols-4">
          <Card>
            <Dato
              etiqueta="Take away"
              valor={<Puntaje pct={promedioValido(takeAway)} />}
              detalle={`${takeAway.length} visita${takeAway.length === 1 ? "" : "s"}`}
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Delivery"
              valor={<Puntaje pct={promedioValido(deliveryMS)} />}
              detalle={`${deliveryMS.length} visita${deliveryMS.length === 1 ? "" : "s"} · promediadas aparte`}
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Auditorías"
              valor={auditorias.length}
              detalle={repartoPorPlanilla(auditorias)}
            />
          </Card>
          <Card>
            <Dato
              etiqueta="En revisión"
              valor={enRevision}
              detalle={enRevision ? "excluidas de los promedios" : "ninguna"}
            />
          </Card>
        </div>

        <section>
          <h2 className="mb-1 border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
            Visitas de mystery shopper
          </h2>
          <p className="mb-3 text-xs text-[var(--color-piedra)]">
            El formulario tiene dos experiencias, take away y delivery, y las dos se listan acá.
            La sección Delivery muestra otra cosa: los indicadores que publican las apps.
          </p>
          <Tabla>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Local</Th>
                <Th>Evaluador</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Puntaje</Th>
                <Th>Clasificación</Th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => {
                const local = v.location_id ? localPorId.get(v.location_id) : null;
                const nivel = nivelDe(v.score_pct);

                return (
                  <tr key={v.id} className="hover:bg-[var(--color-hueso)]">
                    <Td className="whitespace-nowrap tabular-nums">{fechaCorta(v.visit_date)}</Td>
                    <Td className="font-medium">
                      {local ? (
                        <>
                          {local.name}
                          <span className="ml-2 text-xs text-[var(--color-piedra)]">
                            {local.marca}
                          </span>
                        </>
                      ) : (
                        <SinDato>—</SinDato>
                      )}
                    </Td>
                    <Td className="text-[var(--color-piedra)]">{v.evaluator ?? "—"}</Td>
                    <Td className="text-xs uppercase text-[var(--color-piedra)]">
                      {v.experience_type === "delivery" ? "Delivery" : "Take away"}
                    </Td>
                    <Td className="text-right">
                      <Puntaje pct={v.score_pct} />
                    </Td>
                    <Td>
                      {v.needs_review ? (
                        <EnRevision />
                      ) : (
                        <span style={{ color: nivel?.color }}>{v.classification}</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </section>

        <section>
          <h2 className="mb-1 border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
            Auditorías presenciales
          </h2>
          <p className="mb-3 text-xs text-[var(--color-piedra)]">
            La planilla de origen guarda solo la última auditoría de cada local. Acá queda el
            histórico completo: cada corrida se archiva aunque el cliente pise la pestaña. Desde{" "}
            {MES_DEL_CORTE} rige una planilla más exigente: 85 o más cumple, debajo no cumple. Las
            auditorías anteriores se leen con los cinco cortes de su propia planilla: 95 se cumple
            totalmente · 90 mayoritariamente · 70 en buena parte · 50 en partes. Las dos escalas no
            se comparan entre sí. Las anteriores a {MES_DEL_CORTE} vienen del histórico del Looker,
            que guarda solo el puntaje total.
          </p>
          <Tabla>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Local</Th>
                <Th>Auditor</Th>
                <Th>Planilla</Th>
                <Th className="text-right">Puntaje</Th>
                <Th>Nivel</Th>
              </tr>
            </thead>
            <tbody>
              {auditorias.map((a) => {
                const local = a.location_id ? localPorId.get(a.location_id) : null;
                const cerrado = a.location_id ? cerradoPorId.get(a.location_id) : undefined;
                const planilla = escalaAuditoria(a.audit_date);
                const nivel = nivelAuditoria(a.score_pct, a.audit_date);
                return (
                  <tr key={a.id} className="hover:bg-[var(--color-hueso)]">
                    <Td className="whitespace-nowrap tabular-nums">
                      {fechaCorta(a.audit_date)}
                      {tieneFechaEstimada(a) && (
                        <span
                          className="ml-2 text-xs text-[var(--color-piedra)]"
                          title="El Looker no trae el día de esta auditoría. El mes es seguro."
                        >
                          día estimado
                        </span>
                      )}
                    </Td>
                    <Td className="font-medium">
                      {local?.name ??
                        (cerrado ? (
                          <>
                            {cerrado}
                            <span className="ml-2 text-xs text-[var(--color-piedra)]">cerrado</span>
                          </>
                        ) : (
                          <SinDato>—</SinDato>
                        ))}
                    </Td>
                    <Td className="text-[var(--color-piedra)]">
                      {a.auditor ??
                        (esDelLooker(a) ? (
                          <span className="text-xs">sin desglose · histórico del Looker</span>
                        ) : (
                          "—"
                        ))}
                    </Td>
                    <Td className="text-xs uppercase text-[var(--color-piedra)]">
                      {planilla === "desconocida" ? "sin dato" : planilla}
                    </Td>
                    <Td className="text-right">
                      <Puntaje pct={a.score_pct} escala="auditoria" fecha={a.audit_date} />
                    </Td>
                    <Td className="text-xs">
                      <span style={{ color: nivel?.color }}>{nivel?.nombre ?? "—"}</span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </section>

        <section>
          <h2 className="mb-1 border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
            Evolución del puntaje de auditoría
          </h2>
          <p className="mb-3 text-xs text-[var(--color-piedra)]">
            Promedios mensuales de las auditorías de locales activos. El filtro de fecha no recorta
            esta serie.
          </p>
          <Card>
            {serie.meses.length < 2 ? (
              <SinDato>sin dato</SinDato>
            ) : (
              <GraficoLinea
                titulo="Evolución del puntaje de auditoría"
                meses={serie.meses}
                valores={serie.valores}
                formato={(v) => `${v.toFixed(1)}%`}
                marcado={mes}
                corte={{
                  mes: MES_CORTE,
                  antes: "medido con la planilla anterior",
                  desde: "planilla nueva, más exigente",
                }}
              />
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
