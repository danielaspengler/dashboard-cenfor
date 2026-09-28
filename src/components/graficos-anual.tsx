import { etiquetaMes } from "@/lib/filtros";
import {
  ARRIBA,
  CLASE_SERIE,
  Fondo,
  Linea,
  Punto,
  SinDatoGrafico,
  TRAZO_SERIE,
  abreviar,
  alturaUtil,
  anchoColumna,
  centro,
  hayDatos,
  type Marco,
} from "@/components/graficos";

// La comparación año contra año. Vive aparte de `graficos.tsx` solo por
// largo: usa sus mismas piezas, así se ve igual que el resto de los gráficos.

const MESES_DEL_ANIO = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

/** "03" → "mar". */
const mesCorto = (mm: string) => abreviar(`2000-${mm}`).split(" ")[0];

/** Un año de la comparación. `corteDesde` es el mes (0 = enero) desde el que la línea va punteada. */
export type SerieAnual = { anio: string; valores: (number | null)[]; corteDesde?: number };

/**
 * Un año por línea sobre los mismos doce meses: cada mes se lee contra el
 * mismo mes del año anterior.
 *
 * Dibuja los dos últimos años: hay dos colores de serie validados. Un tercer
 * año pide validar un tercer color antes de sumarlo, no generarlo.
 *
 * `marcado` es un mes "YYYY-MM": se sombrea su columna y se rotula el punto
 * de ese año.
 */
export function GraficoPorAnio({
  titulo,
  series,
  formato,
  marcado,
  dominio,
  ancho = 960,
  alto = 180,
}: {
  titulo: string;
  series: SerieAnual[];
  formato: (v: number) => string;
  marcado: string;
  dominio: [number, number];
  ancho?: number;
  alto?: number;
}) {
  const visibles = series.slice(-CLASE_SERIE.length);
  if (!hayDatos(visibles.flatMap((s) => s.valores))) return <SinDatoGrafico />;
  const marco: Marco = { ancho, alto, izq: 64, n: 12 };
  const [min, max] = dominio;
  const y = (v: number) => ARRIBA + ((max - v) / (max - min)) * alturaUtil(marco);
  const x = (i: number) => centro(marco, i);
  const ticks = [0, 1, 2].map((k) => min + ((max - min) * k) / 3);
  const [anioMarcado, mesMarcado = ""] = marcado.split("-");

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" aria-label={titulo} className="block">
      <Fondo marco={marco} meses={MESES_DEL_ANIO} marcado={mesMarcado} ticks={ticks} y={y} formato={formato} soloExtremos={false} rotular={mesCorto} />
      {visibles.map((s, k) => (
        <Linea key={s.anio} valores={s.valores} iCorte={s.corteDesde ?? -1} x={x} y={y} clase={TRAZO_SERIE[k]} />
      ))}
      {visibles.map((s, k) =>
        s.valores.map((v, i) =>
          v === null ? null : (
            <Punto
              key={`${s.anio}-${i}`}
              valor={v}
              cx={x(i)}
              ancho={anchoColumna(marco)}
              y={y}
              marco={marco}
              tooltip={`${etiquetaMes(`${s.anio}-${MESES_DEL_ANIO[i]}`)} · ${formato(v)}`}
              rotulo={s.anio === anioMarcado && MESES_DEL_ANIO[i] === mesMarcado ? formato(v) : null}
              clase={CLASE_SERIE[k]}
            />
          ),
        ),
      )}
    </svg>
  );
}
