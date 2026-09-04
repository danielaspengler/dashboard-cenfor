import { getAuditorias, getMarcasYLocales, getVisitas, promedioValido } from "@/lib/data";
import { nivelDe } from "@/lib/marca";
import { type Busqueda, desdeDe, enPeriodo, leerPeriodo } from "@/lib/filtros";
import { FiltroPeriodo } from "@/components/filtros";
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

  const periodo = leerPeriodo(filtros.periodo);
  const desde = desdeDe(periodo);
  const visitas = todasLasVisitas.filter((v) => enPeriodo(v.visit_date, desde));
  const auditorias = todasLasAuditorias.filter((a) => enPeriodo(a.audit_date, desde));

  const localPorId = new Map(locales.map((l) => [l.id, l]));
  // Take away y delivery se miden distinto y no se promedian juntos: el
  // delivery vive en su propia sección.
  const takeAway = visitas.filter((v) => v.experience_type === "take_away");
  const enRevision = visitas.filter((v) => v.needs_review).length;

  return (
    <>
      <PageHeader
        titulo="Mystery Shopper y Auditorías"
        bajada="Puntajes calculados por las planillas del cliente · Excelente ≥90 · Bueno ≥75 · Regular ≥60"
        extra={<FiltroPeriodo actual={periodo} />}
      />

      <div className="space-y-8 p-7">
        <div className="grid gap-5 md:grid-cols-4">
          <Card>
            <Dato etiqueta="Visitas take away" valor={takeAway.length} />
          </Card>
          <Card>
            <Dato etiqueta="Promedio" valor={<Puntaje pct={promedioValido(takeAway)} />} />
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
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
            Visitas de mystery shopper
          </h2>
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
