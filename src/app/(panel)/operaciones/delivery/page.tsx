import { getMarcasYLocales, getVisitas, promedioValido } from "@/lib/data";
import { type Busqueda, desdeDe, enPeriodo, etiquetaDe, leerPeriodo } from "@/lib/filtros";
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

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [{ locales }, todasLasVisitas] = await Promise.all([getMarcasYLocales(), getVisitas()]);

  const periodo = leerPeriodo(filtros.periodo);
  const desde = desdeDe(periodo);
  const visitas = todasLasVisitas.filter((v) => enPeriodo(v.visit_date, desde));

  const localPorId = new Map(locales.map((l) => [l.id, l]));

  // Solo Censurado tiene delivery. Formaggio no vende por ese canal, así que
  // no aparece: mostrarlo en cero sería inventar un problema que no existe.
  const delivery = visitas.filter((v) => v.experience_type === "delivery");
  const validas = delivery.filter((v) => !v.needs_review);

  return (
    <>
      <PageHeader
        titulo="Delivery"
        bajada="Bloque de delivery del mystery shopper de Censurado · Formaggio no vende por este canal"
        extra={<FiltroPeriodo actual={periodo} />}
      />

      <div className="space-y-8 p-7">
        {delivery.length < 3 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong className="font-medium">Muestra chica.</strong> Hay {delivery.length} visita
            {delivery.length === 1 ? "" : "s"} de delivery cargada
            {delivery.length === 1 ? "" : "s"}
            {delivery.length - validas.length > 0 &&
              `, ${delivery.length - validas.length} de ellas con el puntaje en revisión`}
            . Los números de esta sección todavía no permiten sacar conclusiones: se llena a
            medida que se carguen más visitas en el formulario.
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <Dato etiqueta="Visitas de delivery" valor={delivery.length} />
          </Card>
          <Card>
            <Dato
              etiqueta="Promedio"
              valor={<Puntaje pct={promedioValido(delivery)} />}
              detalle={
                validas.length
                  ? `sobre ${validas.length} visita${validas.length === 1 ? "" : "s"} válida${validas.length === 1 ? "" : "s"}`
                  : "sin visitas válidas"
              }
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Locales evaluados"
              valor={new Set(delivery.map((v) => v.location_id)).size}
            />
          </Card>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
            Visitas
          </h2>
          {delivery.length === 0 ? (
            <Card>
              {/* Distinguir las dos cosas importa: que no haya visitas nunca
                  es un problema de carga; que no las haya en el período es
                  el filtro haciendo su trabajo. */}
              <SinDato>
                {periodo === "todo"
                  ? "Todavía no hay visitas de delivery cargadas."
                  : `No hay visitas de delivery en ${etiquetaDe(periodo).toLowerCase()}.`}
              </SinDato>
            </Card>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Local</Th>
                  <Th>Evaluador</Th>
                  <Th className="text-right">Puntaje</Th>
                  <Th>Clasificación</Th>
                  <Th>Detalle por sección</Th>
                </tr>
              </thead>
              <tbody>
                {delivery.map((v) => {
                  const local = v.location_id ? localPorId.get(v.location_id) : null;
                  return (
                    <tr key={v.id} className="hover:bg-[var(--color-hueso)]">
                      <Td className="whitespace-nowrap tabular-nums">{fechaCorta(v.visit_date)}</Td>
                      <Td className="font-medium">{local?.name ?? <SinDato>—</SinDato>}</Td>
                      <Td className="text-[var(--color-piedra)]">{v.evaluator ?? "—"}</Td>
                      <Td className="text-right">
                        <Puntaje pct={v.score_pct} />
                      </Td>
                      <Td>{v.needs_review ? <EnRevision /> : v.classification}</Td>
                      <Td className="text-xs text-[var(--color-piedra)]">
                        {Object.entries(v.sections ?? {})
                          .map(([k, val]) => `${k.replace("[DE] ", "")} ${val.toFixed(0)}%`)
                          .join(" · ") || "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          )}
        </section>
      </div>
    </>
  );
}
