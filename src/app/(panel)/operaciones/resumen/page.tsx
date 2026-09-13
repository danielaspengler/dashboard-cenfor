import {
  getMarcasYLocales,
  getResenas,
  getUltimosSnapshots,
  getVisitas,
  getAuditorias,
  promedioValido,
} from "@/lib/data";
import { MARCA, MES_CORTE, escalaAuditoria } from "@/lib/marca";
import { promedioAuditorias, type PromedioAuditorias } from "@/lib/auditorias";
import {
  MES_TODO,
  type Busqueda,
  enMes,
  etiquetaMes,
  leerMarca,
  leerMesFiltro,
  mesesDeFechas,
} from "@/lib/filtros";
import { FiltroMarca, FiltroMeses } from "@/components/filtros";
import { Card, Dato, PageHeader, Puntaje, SinDato, Tabla, Td, Th, fechaCorta } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * La tarjeta de auditorías de una marca.
 *
 * Con auditorías de los dos lados del corte NO hay un número único: se muestran
 * los dos promedios, el nuevo arriba. No es una convención que haya que
 * recordar, es lo único que compila: el caso mixto de `promedioAuditorias()` no
 * trae un campo `valor`.
 */
function TarjetaAuditorias({
  promedio,
  auditaAlguno,
}: {
  promedio: PromedioAuditorias;
  auditaAlguno: boolean;
}) {
  if (promedio.tipo === "sin_dato") {
    return (
      <Dato
        etiqueta="Auditorías"
        valor={<SinDato>—</SinDato>}
        detalle={auditaAlguno ? "sin auditorías" : "no aplica"}
      />
    );
  }
  if (promedio.tipo === "unico") {
    return (
      <Dato
        etiqueta="Auditorías"
        valor={<Puntaje pct={promedio.valor} escala="auditoria" planilla={promedio.escala} />}
        detalle={`${promedio.visitas} realizadas · planilla ${promedio.escala}`}
      />
    );
  }
  return (
    <Dato
      etiqueta="Auditorías"
      valor={
        <span className="block">
          <Puntaje pct={promedio.nueva.valor} escala="auditoria" planilla="nueva" />
          <span className="block text-sm font-normal text-[var(--color-piedra)]">
            {promedio.anterior.valor === null
              ? "sin dato"
              : `${promedio.anterior.valor.toFixed(1)}%`}{" "}
            con la planilla anterior
          </span>
        </span>
      }
      detalle={`${promedio.nueva.visitas} con la planilla nueva · ${promedio.anterior.visitas} con la anterior. Promedios separados.`}
    />
  );
}

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const filtros = await searchParams;
  const [{ marcas, locales }, resenas, snapshots, visitas, auditorias] = await Promise.all([
    getMarcasYLocales(),
    getResenas(500),
    getUltimosSnapshots(),
    getVisitas(),
    getAuditorias(),
  ]);

  const marcaElegida = leerMarca(filtros.marca, marcas.map((m) => m.slug));

  // El Resumen junta las tres fuentes con fecha, así que ofrece los meses de
  // las tres: es la portada del área y tiene que poder abrir cualquier mes que
  // alguna sección tenga cargado.
  const meses = mesesDeFechas([
    ...visitas.map((v) => v.visit_date),
    ...auditorias.map((a) => a.audit_date),
    ...resenas.map((r) => r.review_date),
  ]);
  const mes = leerMesFiltro(filtros.mes, meses);

  // El mes recorta las visitas, las auditorías y las reseñas, que son hechos
  // con fecha. NO recorta el acumulado de Google: ese número es el total
  // histórico de la ficha, no una suma de reseñas del mes, y filtrarlo daría
  // un promedio que no existe en ninguna parte.
  const visitasDelMes = visitas.filter((v) => enMes(v.visit_date, mes));
  const auditoriasDelMes = auditorias.filter((a) => enMes(a.audit_date, mes));
  const resenasDelMes = resenas.filter((r) => enMes(r.review_date, mes));

  const marcasVisibles = marcas.filter((m) => marcaElegida === "todas" || m.slug === marcaElegida);
  const idsVisibles = new Set(
    locales.filter((l) => marcasVisibles.some((m) => m.id === l.brand_id)).map((l) => l.id),
  );
  const localesVisibles = locales.filter((l) => idsVisibles.has(l.id));

  // El pie de la tabla avisa del corte solo cuando lo que está a la vista cae
  // de los dos lados: con un mes elegido nunca pasa, con "Todo" sí.
  const hayMixtura =
    promedioAuditorias(
      auditoriasDelMes.filter((a) => a.location_id && idsVisibles.has(a.location_id)),
    ).tipo === "mixto";

  const porMarca = marcasVisibles.map((marca) => {
    const suyos = locales.filter((l) => l.brand_id === marca.id);
    const ids = new Set(suyos.map((l) => l.id));

    // Promedio de Google ponderado por cantidad de reseñas: un local con 245
    // reseñas pesa más que uno con 13. El promedio simple de promedios diría
    // otra cosa.
    const fotos = suyos.map((l) => snapshots.get(l.id)).filter(Boolean);
    const total = fotos.reduce((a, f) => a + (f!.reviews_count ?? 0), 0);
    const google = total
      ? fotos.reduce((a, f) => a + (f!.total_score ?? 0) * (f!.reviews_count ?? 0), 0) / total
      : null;

    const visitasMarca = visitasDelMes.filter((v) => v.location_id && ids.has(v.location_id));
    const auditoriasMarca = auditoriasDelMes.filter(
      (a) => a.location_id && ids.has(a.location_id),
    );

    return {
      marca,
      locales: suyos,
      google,
      totalResenas: total,
      resenasNuevas: resenasDelMes.filter((r) => r.location_id && ids.has(r.location_id)).length,
      msPromedio: promedioValido(visitasMarca),
      msCantidad: visitasMarca.length,
      msEnRevision: visitasMarca.filter((v) => v.needs_review).length,
      // El único lugar del tablero donde un promedio de auditorías podía cruzar
      // el corte: el filtro por defecto es "Todo".
      auditorias: promedioAuditorias(auditoriasMarca),
      // Formaggio no audita: sin auditorías y sin pestaña, es "no aplica".
      // Con pestaña pero sin auditorías en el período, es "sin auditorías".
      auditaAlguno: suyos.some((l) => l.audit_sheet_label),
    };
  });

  return (
    <>
      <PageHeader
        titulo="Resumen de Operaciones"
        bajada={`${localesVisibles.length} ${
          localesVisibles.length === 1 ? "local" : "locales"
        } · ${marcasVisibles.length} ${marcasVisibles.length === 1 ? "marca" : "marcas"}`}
        extra={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <FiltroMarca
              actual={marcaElegida}
              marcas={marcas.map((m) => ({
                slug: m.slug,
                name: m.name,
                color: MARCA.marcas[m.slug as keyof typeof MARCA.marcas]?.color ?? "#1c1c1a",
              }))}
            />
            <FiltroMeses actual={mes} meses={meses} />
          </div>
        }
      />

      <div className="space-y-8 p-7">
        {/* Una tarjeta por marca. Nunca un número CENFOR único: promediar
            Censurado con Formaggio no significa nada. */}
        <div
          className={`grid gap-5 ${marcasVisibles.length > 1 ? "md:grid-cols-2" : "md:max-w-md"}`}
        >
          {porMarca.map((m) => {
            const color =
              MARCA.marcas[m.marca.slug as keyof typeof MARCA.marcas]?.color ?? "#1c1c1a";
            return (
              <Card key={m.marca.id}>
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <h2 className="font-semibold">{m.marca.name}</h2>
                  <span className="text-xs text-[var(--color-piedra)]">
                    {m.locales.length} locales
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Dato
                    etiqueta="Google"
                    valor={m.google ? `${m.google.toFixed(2)}★` : <SinDato>—</SinDato>}
                    detalle={m.totalResenas ? `${m.totalResenas} reseñas` : undefined}
                  />
                  <Dato
                    etiqueta="Mystery Shopper"
                    valor={<Puntaje pct={m.msPromedio} />}
                    detalle={
                      m.msCantidad
                        ? `${m.msCantidad} visita${m.msCantidad === 1 ? "" : "s"}` +
                          (m.msEnRevision ? ` · ${m.msEnRevision} en revisión` : "")
                        : "sin visitas"
                    }
                  />
                  <TarjetaAuditorias promedio={m.auditorias} auditaAlguno={m.auditaAlguno} />
                </div>
              </Card>
            );
          })}
        </div>

        <section>
          <h2 className="mb-3 border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
            Detalle por local
          </h2>
          <Tabla>
            <thead>
              <tr>
                <Th>Marca</Th>
                <Th>Local</Th>
                <Th className="text-right">Google</Th>
                <Th className="text-right">Reseñas</Th>
                <Th className="text-right">Mystery Shopper</Th>
                <Th className="text-right">Última auditoría</Th>
              </tr>
            </thead>
            <tbody>
              {localesVisibles.map((l) => {
                const foto = snapshots.get(l.id);
                const suyas = visitasDelMes.filter((v) => v.location_id === l.id);
                const ultima = auditoriasDelMes.find((a) => a.location_id === l.id);
                const color =
                  MARCA.marcas[
                    (marcas.find((m) => m.id === l.brand_id)?.slug ??
                      "") as keyof typeof MARCA.marcas
                  ]?.color ?? "#1c1c1a";

                return (
                  <tr key={l.id} className="hover:bg-[var(--color-hueso)]">
                    <Td>
                      <span className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {l.marca}
                      </span>
                    </Td>
                    <Td className="font-medium">{l.name}</Td>
                    <Td className="text-right tabular-nums">
                      {foto?.total_score ? `${foto.total_score}★` : <SinDato>sin ficha</SinDato>}
                    </Td>
                    <Td className="text-right tabular-nums text-[var(--color-piedra)]">
                      {foto?.reviews_count ?? "—"}
                    </Td>
                    <Td className="text-right">
                      <Puntaje pct={promedioValido(suyas)} />
                    </Td>
                    <Td className="text-right">
                      {ultima ? (
                        <span>
                          <Puntaje
                            pct={ultima.score_pct}
                            escala="auditoria"
                            fecha={ultima.audit_date}
                          />
                          <span className="ml-2 text-xs text-[var(--color-piedra)]">
                            {fechaCorta(ultima.audit_date)}
                            {escalaAuditoria(ultima.audit_date) === "nueva"
                              ? " · planilla nueva"
                              : ""}
                          </span>
                        </span>
                      ) : (
                        <SinDato>{l.audit_sheet_label ? "sin auditar" : "no aplica"}</SinDato>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
          <p className="mt-2 text-xs text-[var(--color-piedra)]">
            Formaggio no tiene auditorías presenciales. Un local sin ficha de Google no tiene
            reseñas cargadas — no es un cero.
            {hayMixtura && (
              <>
                {" "}
                Las auditorías desde{" "}
                <strong className="font-medium">{etiquetaMes(MES_CORTE).toLowerCase()}</strong> se
                midieron con una planilla más exigente.
              </>
            )}
            {mes !== MES_TODO && (
              <>
                {" "}
                Mystery shopper y auditorías muestran{" "}
                <strong className="font-medium">{etiquetaMes(mes).toLowerCase()}</strong>; la
                columna Google es el acumulado histórico de la ficha y no se filtra por fecha.
              </>
            )}
          </p>
        </section>
      </div>
    </>
  );
}
