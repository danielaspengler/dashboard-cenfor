import { getAuditorias, getMarcasYLocales, getVisitas, promedioValido } from "@/lib/data";
import { nivelDe } from "@/lib/marca";
import { type Busqueda, enMes, leerMesFiltro, mesesDeFechas } from "@/lib/filtros";
import { FiltroMeses } from "@/components/filtros";
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

export default async function MsAuditoriasPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [{ locales }, todasLasVisitas, todasLasAuditorias] = await Promise.all([
    getMarcasYLocales(),
    getVisitas(),
    getAuditorias(),
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
  // Las dos experiencias del formulario viven acá, pero NO se promedian
  // juntas: un pedido por delivery y una visita al salón no miden lo mismo.
  // (La sección Delivery muestra los indicadores de las apps —Rappi—, que son
  // otra fuente: no tiene nada que ver con estas visitas.)
  const takeAway = visitas.filter((v) => v.experience_type === "take_away");
  const deliveryMS = visitas.filter((v) => v.experience_type === "delivery");
  const enRevision = visitas.filter((v) => v.needs_review).length;

  return (
    <>
      <PageHeader
        titulo="Mystery Shopper y Auditorías"
        bajada="Puntajes calculados por las planillas del cliente · Excelente ≥90 · Bueno ≥75 · Regular ≥60"
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
            <Dato etiqueta="Auditorías" valor={auditorias.length} detalle="solo Censurado" />
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
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
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
                <Th>Dónde perdió puntos</Th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => {
                const local = v.location_id ? localPorId.get(v.location_id) : null;
                const nivel = nivelDe(v.score_pct);
                // La sección más floja de la visita: es lo accionable.
                const secciones = Object.entries(v.sections ?? {});
                const peor = secciones.length
                  ? secciones.reduce((a, b) => (a[1] <= b[1] ? a : b))
                  : null;

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
                    <Td className="text-xs text-[var(--color-piedra)]">
                      {peor ? `${peor[0]}: ${peor[1].toFixed(0)}%` : "—"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
            Auditorías presenciales
          </h2>
          <p className="mb-3 text-xs text-[var(--color-piedra)]">
            La planilla de origen guarda solo la última auditoría de cada local. Acá queda el
            histórico completo: cada corrida se archiva aunque el cliente pise la pestaña.
          </p>
          <Tabla>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Local</Th>
                <Th>Auditor</Th>
                <Th className="text-right">Puntaje</Th>
                <Th>Pestaña de origen</Th>
              </tr>
            </thead>
            <tbody>
              {auditorias.map((a) => {
                const local = a.location_id ? localPorId.get(a.location_id) : null;
                return (
                  <tr key={a.id} className="hover:bg-[var(--color-hueso)]">
                    <Td className="whitespace-nowrap tabular-nums">{fechaCorta(a.audit_date)}</Td>
                    <Td className="font-medium">{local?.name ?? <SinDato>—</SinDato>}</Td>
                    <Td className="text-[var(--color-piedra)]">{a.auditor ?? "—"}</Td>
                    <Td className="text-right">
                      <Puntaje pct={a.score_pct} />
                    </Td>
                    <Td className="text-xs text-[var(--color-piedra)]">{a.source_sheet}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </section>
      </div>
    </>
  );
}
