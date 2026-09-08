import { getMarcasYLocales, getResenas, getUltimosSnapshots, promedioResenas } from "@/lib/data";
import { MARCA, nivelResena } from "@/lib/marca";
import { MES_TODO, type Busqueda, enMes, etiquetaMes, leerMesFiltro, mesesDeFechas } from "@/lib/filtros";
import { FiltroMeses } from "@/components/filtros";
import { Card, Dato, PageHeader, SinDato, Tabla, Td, Th, fechaCorta } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResenasPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [{ marcas, locales }, todasLasResenas, snapshots] = await Promise.all([
    getMarcasYLocales(),
    getResenas(500),
    getUltimosSnapshots(),
  ]);

  // El mes recorta las reseñas nuevas, que tienen fecha. El acumulado de la
  // ficha de Google es el total histórico del local y queda como está.
  const meses = mesesDeFechas(todasLasResenas.map((r) => r.review_date));
  const mes = leerMesFiltro(filtros.mes, meses);
  const resenas = todasLasResenas.filter((r) => enMes(r.review_date, mes));

  const localPorId = new Map(locales.map((l) => [l.id, l]));
  const promedioNuevas = promedioResenas(resenas);
  const nivel = nivelResena(promedioNuevas);

  const totalGoogle = [...snapshots.values()].reduce((a, s) => a + (s.reviews_count ?? 0), 0);
  const positivas = resenas.filter((r) => (r.rating ?? 0) >= 4).length;

  // Distribución de estrellas de las reseñas recientes.
  const distribucion = [5, 4, 3, 2, 1].map((estrellas) => ({
    estrellas,
    cantidad: resenas.filter((r) => Math.round(r.rating ?? 0) === estrellas).length,
  }));
  const maxDist = Math.max(...distribucion.map((d) => d.cantidad), 1);

  return (
    <>
      <PageHeader
        titulo="Puntuaciones y reseñas"
        bajada="Google Maps · acumulado histórico y reseñas recientes"
        extra={<FiltroMeses actual={mes} meses={meses} />}
      />

      <div className="space-y-8 p-7">
        <div className="grid gap-5 md:grid-cols-4">
          <Card>
            <Dato
              etiqueta="Reseñas acumuladas"
              valor={totalGoogle.toLocaleString("es-AR")}
              detalle="histórico en Google"
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Reseñas recientes"
              valor={resenas.length}
              detalle={
                mes === MES_TODO ? "las que trajo el scraper" : etiquetaMes(mes).toLowerCase()
              }
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Promedio reciente"
              valor={promedioNuevas ? `${promedioNuevas.toFixed(2)}★` : <SinDato>—</SinDato>}
              color={nivel?.color}
            />
          </Card>
          <Card>
            <Dato
              etiqueta="Positivas ≥4★"
              valor={resenas.length ? `${Math.round((positivas / resenas.length) * 100)}%` : "—"}
              detalle={`${positivas} de ${resenas.length}`}
            />
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <h2 className="mb-4 text-sm font-medium">Distribución reciente</h2>
            <div className="space-y-2">
              {distribucion.map((d) => (
                <div key={d.estrellas} className="flex items-center gap-3 text-sm">
                  <span className="w-8 tabular-nums text-[var(--color-piedra)]">{d.estrellas}★</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-hueso)]">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(d.cantidad / maxDist) * 100}%`,
                        backgroundColor: d.estrellas >= 4 ? "#15803d" : d.estrellas === 3 ? "#d97706" : "#b91c1c",
                      }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums">{d.cantidad}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Tabla>
              <thead>
                <tr>
                  <Th>Marca</Th>
                  <Th>Local</Th>
                  <Th className="text-right">Acumulado</Th>
                  <Th className="text-right">Reseñas</Th>
                  <Th className="text-right">Recientes</Th>
                </tr>
              </thead>
              <tbody>
                {locales.map((l) => {
                  const foto = snapshots.get(l.id);
                  const recientes = resenas.filter((r) => r.location_id === l.id);
                  const n = nivelResena(foto?.total_score);
                  const color =
                    MARCA.marcas[
                      (marcas.find((m) => m.id === l.brand_id)?.slug ?? "") as keyof typeof MARCA.marcas
                    ]?.color ?? "#1c1c1a";
                  return (
                    <tr key={l.id} className="hover:bg-[var(--color-hueso)]">
                      <Td>
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </Td>
                      <Td className="font-medium">{l.name}</Td>
                      <Td className="text-right">
                        {foto?.total_score ? (
                          <span className="font-semibold tabular-nums" style={{ color: n?.color }}>
                            {foto.total_score}★
                          </span>
                        ) : (
                          <SinDato>sin ficha</SinDato>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums text-[var(--color-piedra)]">
                        {foto?.reviews_count ?? "—"}
                      </Td>
                      <Td className="text-right tabular-nums text-[var(--color-piedra)]">
                        {recientes.length || "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-piedra)]">
            Últimas reseñas
          </h2>
          <div className="space-y-3">
            {resenas.length === 0 && (
              <Card className="p-4">
                <SinDato>
                  No hay reseñas en {etiquetaMes(mes).toLowerCase()}. El acumulado de arriba
                  no cambia: es el histórico de la ficha de Google.
                </SinDato>
              </Card>
            )}
            {resenas.slice(0, 40).map((r) => {
              const local = r.location_id ? localPorId.get(r.location_id) : null;
              const n = nivelResena(r.rating);
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold tabular-nums" style={{ color: n?.color }}>
                      {r.rating}★
                    </span>
                    <span className="font-medium">{r.author ?? "Anónimo"}</span>
                    <span className="text-xs text-[var(--color-piedra)]">
                      {local ? `${local.marca} · ${local.name}` : "local desconocido"} ·{" "}
                      {fechaCorta(r.review_date)}
                    </span>
                  </div>
                  {r.text && <p className="mt-2 text-sm leading-relaxed">{r.text}</p>}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
