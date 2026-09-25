import { etiquetaMes } from "@/lib/filtros";

// Los gráficos del tablero: SVG escrito a mano, de servidor, sin librerías.
//
// Colores solo de `globals.css`: tinta y piedra para las series, borde para las
// guías, nube para el mes elegido. Nada de verde, rojo ni colores de marca: un
// color en un número económico se leería como un criterio que CENFOR no dio.
//
// Un `null` es un mes sin dato: queda el hueco, nunca una barra en cero.

export type Serie = { nombre: string; valores: (number | null)[] };

type Marco = { ancho: number; alto: number; izq: number; n: number };

const ARRIBA = 18;
const ABAJO = 22;
const DER = 8;
const CLASE_SERIE = ["fill-[var(--color-tinta)]", "fill-[var(--color-piedra)]"];

const alturaUtil = (m: Marco) => m.alto - ARRIBA - ABAJO;
const anchoColumna = (m: Marco) => (m.ancho - m.izq - DER) / m.n;
const centro = (m: Marco, i: number) => m.izq + anchoColumna(m) * (i + 0.5);

const hayDatos = (valores: (number | null)[]) => valores.some((v) => v !== null);

/** Lo que ocupa un rótulo de mes ("ago 26") a 10 px, con aire a los lados. */
const ANCHO_ROTULO = 40;

/** Sin ningún valor no se dibujan ejes: una escala de 0 a 1 se leería como un cero. */
function SinDatoGrafico() {
  return <p className="py-6 text-center text-sm italic text-[var(--color-piedra)]">sin dato</p>;
}

/** "2026-08" → "ago 26". */
function abreviar(mes: string): string {
  const [nombre, anio] = etiquetaMes(mes).split(" ");
  return `${nombre.slice(0, 3).toLowerCase()} ${anio.slice(2)}`;
}

/** El piso y el techo de una escala, con aire arriba y abajo. Incluye siempre el cero. */
export function extremos(valores: (number | null)[]): [number, number] {
  const nums = valores.filter((v): v is number => v !== null);
  if (!nums.length) return [0, 1];
  const min = Math.min(0, ...nums);
  const max = Math.max(0, ...nums);
  const aire = (max - min) * 0.15 || 1;
  return [min < 0 ? min - aire : 0, max + aire];
}

/** Franja del mes elegido, guías con su valor y meses abajo. */
function Fondo({
  marco,
  meses,
  marcado,
  ticks,
  y,
  formato,
  soloExtremos,
}: {
  marco: Marco;
  meses: string[];
  marcado: string;
  ticks: number[];
  y: (v: number) => number;
  formato: (v: number) => string;
  soloExtremos: boolean;
}) {
  const cw = anchoColumna(marco);
  const i = meses.indexOf(marcado);
  // En un gráfico chico trece rótulos se pisan: quedan el primero, el último y el elegido.
  // En uno grande con muchos meses va uno cada `paso`, contado desde el último para
  // que el mes más reciente siempre se lea. El elegido se muestra siempre, y sus
  // vecinos a menos de un paso se callan para no pisarlo.
  const paso = Math.ceil(ANCHO_ROTULO / cw);
  const conRotulo = (k: number) => {
    if (k === i) return true;
    if (soloExtremos) return k === 0 || k === meses.length - 1;
    if (i >= 0 && Math.abs(k - i) < paso) return false;
    return (meses.length - 1 - k) % paso === 0;
  };
  return (
    <g>
      {i >= 0 && (
        <rect
          x={marco.izq + cw * i}
          y={ARRIBA - 14}
          width={cw}
          height={alturaUtil(marco) + 14}
          className="fill-[var(--color-nube)]"
        />
      )}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={marco.izq}
            x2={marco.ancho - DER}
            y1={y(t)}
            y2={y(t)}
            className="stroke-[var(--color-borde)]"
          />
          <text x={marco.izq - 6} y={y(t) + 3} textAnchor="end" fontSize={10} className="fill-[var(--color-piedra)]">
            {formato(t)}
          </text>
        </g>
      ))}
      {meses.map((m, k) =>
        conRotulo(k) ? (
          <text
            key={m}
            x={centro(marco, k)}
            y={marco.alto - 6}
            textAnchor="middle"
            fontSize={10}
            className={m === marcado ? "fill-[var(--color-tinta)] font-semibold" : "fill-[var(--color-piedra)]"}
          >
            {abreviar(m)}
          </text>
        ) : null,
      )}
    </g>
  );
}

/** El rótulo de las dos series, para ir al lado del título. */
export function Leyenda({ series }: { series: Serie[] }) {
  if (series.length < 2) return null;
  return (
    <span className="flex items-center gap-3 text-xs text-[var(--color-piedra)]">
      {series.map((s, k) => (
        <span key={s.nombre} className="flex items-center gap-1">
          <svg width="10" height="10" aria-hidden="true">
            <rect width="10" height="10" className={CLASE_SERIE[k]} />
          </svg>
          {s.nombre}
        </span>
      ))}
    </span>
  );
}

/** Una barra, o la zona transparente que guarda el tooltip de un mes sin dato. */
function Barra({
  valor,
  x,
  ancho,
  y,
  marco,
  tooltip,
  clase,
  rotulo,
  ancla,
}: {
  valor: number | null;
  x: number;
  ancho: number;
  y: (v: number) => number;
  marco: Marco;
  tooltip: string;
  clase: string;
  rotulo: string | null;
  ancla: "middle" | "end" | "start";
}) {
  if (valor === null)
    return (
      <rect x={x} y={ARRIBA} width={ancho} height={alturaUtil(marco)} fill="transparent">
        <title>{tooltip}</title>
      </rect>
    );
  return (
    <g>
      <rect x={x} y={y(valor)} width={ancho} height={y(0) - y(valor)} className={clase}>
        <title>{tooltip}</title>
      </rect>
      {rotulo !== null && (
        <text x={x + ancho / 2} y={y(valor) - 4} textAnchor={ancla} fontSize={10} className="fill-[var(--color-tinta)] font-semibold">
          {rotulo}
        </text>
      )}
    </g>
  );
}

/** Barras por mes, de una o dos series, desde cero. */
export function GraficoBarras({
  titulo,
  meses,
  series,
  formato,
  marcado,
  alto = 220,
}: {
  titulo: string;
  meses: string[];
  series: Serie[];
  formato: (v: number) => string;
  marcado: string;
  alto?: number;
}) {
  if (!hayDatos(series.flatMap((s) => s.valores))) return <SinDatoGrafico />;
  const marco: Marco = { ancho: 640, alto, izq: 64, n: Math.max(meses.length, 1) };
  const [, tope] = extremos(series.flatMap((s) => s.valores));
  const y = (v: number) => ARRIBA + (1 - v / tope) * alturaUtil(marco);
  const cw = anchoColumna(marco);
  const bw = (cw * 0.7) / series.length;

  return (
    <svg viewBox={`0 0 ${marco.ancho} ${alto}`} width="100%" role="img" aria-label={titulo} className="block">
      <Fondo marco={marco} meses={meses} marcado={marcado} ticks={[0, tope / 3, (2 * tope) / 3]} y={y} formato={formato} soloExtremos={false} />
      {series.map((s, k) =>
        s.valores.map((v, i) => {
          const nombre = series.length > 1 ? ` · ${s.nombre}` : "";
          return (
            <Barra
              key={`${k}-${i}`}
              valor={v}
              x={marco.izq + cw * i + cw * 0.15 + bw * k}
              ancho={bw}
              y={y}
              marco={marco}
              tooltip={`${etiquetaMes(meses[i])}${nombre} · ${v === null ? "sin dato" : formato(v)}`}
              clase={CLASE_SERIE[k]}
              rotulo={meses[i] === marcado && v !== null ? formato(v) : null}
              // Con dos series, cada rótulo sale hacia su lado para no pisarse.
              ancla={series.length === 1 ? "middle" : k === 0 ? "end" : "start"}
            />
          );
        }),
      )}
    </svg>
  );
}

/** Los tramos de la línea: un `null` la corta en vez de unirla a través del hueco. */
function tramos(valores: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let abierto = false;
  valores.forEach((v, i) => {
    if (v === null) {
      abierto = false;
      return;
    }
    d += `${abierto ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    abierto = true;
  });
  return d.trim();
}

/** Un punto de la línea, o la zona transparente que guarda el tooltip de un mes sin dato. */
function Punto({
  valor,
  cx,
  ancho,
  y,
  marco,
  tooltip,
  rotulo,
}: {
  valor: number | null;
  cx: number;
  ancho: number;
  y: (v: number) => number;
  marco: Marco;
  tooltip: string;
  rotulo: string | null;
}) {
  if (valor === null)
    return (
      <rect x={cx - ancho / 2} y={ARRIBA} width={ancho} height={alturaUtil(marco)} fill="transparent">
        <title>{tooltip}</title>
      </rect>
    );
  return (
    <g>
      <circle cx={cx} cy={y(valor)} r={3.5} className="fill-[var(--color-tinta)]">
        <title>{tooltip}</title>
      </circle>
      {rotulo !== null && (
        <text x={cx} y={y(valor) - 8} textAnchor="middle" fontSize={10} className="fill-[var(--color-tinta)] font-semibold">
          {rotulo}
        </text>
      )}
    </g>
  );
}

/** Dos formas de medir la misma serie, separadas por un mes. */
export type CorteSerie = {
  /** El mes desde el que rige la vara nueva, "YYYY-MM". */
  mes: string;
  /** Qué dice la etiqueta de cada lado de la línea. Sin `desde`, el tramo nuevo va sin rótulo. */
  antes: string;
  desde?: string;
};

/**
 * La frontera entre dos formas de medir la misma serie.
 *
 * Cae en el BORDE IZQUIERDO de la columna del mes del corte, no sobre su
 * punto: el cambio pasó entre dos meses, no dentro de uno.
 *
 * Con meses de un solo lado no se dibuja nada: no hay frontera que marcar. Y
 * la etiqueta de un tramo de un solo mes se omite, porque no entra en el ancho
 * de una columna y se pisaría con la otra. La línea punteada ya marca el corte.
 */
function MarcaCorte({
  marco,
  meses,
  corte,
}: {
  marco: Marco;
  meses: string[];
  corte: CorteSerie;
}) {
  const i = meses.indexOf(corte.mes);
  if (i <= 0) return null;
  const x = marco.izq + anchoColumna(marco) * i;
  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={ARRIBA - 14}
        y2={ARRIBA + alturaUtil(marco)}
        strokeDasharray="3 3"
        className="stroke-[var(--color-grafito)]"
      />
      {i > 1 && (
        <text x={x - 4} y={ARRIBA - 5} textAnchor="end" fontSize={9} className="fill-[var(--color-piedra)]">
          {corte.antes}
        </text>
      )}
      {corte.desde && meses.length - i > 1 && (
        <text x={x + 4} y={ARRIBA - 5} textAnchor="start" fontSize={9} className="fill-[var(--color-piedra)]">
          {corte.desde}
        </text>
      )}
    </g>
  );
}

/**
 * La línea de la serie: entera, o partida en dos por el corte.
 *
 * El tramo desde el corte va punteado, y el segmento que une los dos tramos
 * también: es el que cruza de una vara a la otra.
 */
function Linea({
  valores,
  iCorte,
  x,
  y,
}: {
  valores: (number | null)[];
  iCorte: number;
  x: (i: number) => number;
  y: (v: number) => number;
}) {
  const clase = "stroke-[var(--color-tinta)]";
  if (iCorte <= 0)
    return <path d={tramos(valores, x, y)} fill="none" strokeWidth={2} className={clase} />;
  const parte = (dentro: (i: number) => boolean) =>
    valores.map((v, i) => (dentro(i) ? v : null));
  return (
    <>
      <path d={tramos(parte((i) => i < iCorte), x, y)} fill="none" strokeWidth={2} className={clase} />
      <path
        d={tramos(parte((i) => i >= iCorte - 1), x, y)}
        fill="none"
        strokeWidth={2}
        strokeDasharray="4 3"
        className={clase}
      />
    </>
  );
}

/**
 * Una línea con puntos por mes.
 *
 * `dominio` fija la escala: los gráficos chicos de rentabilidad por local la
 * comparten para poder compararse. Si la escala baja de cero, la línea del
 * cero va marcada.
 *
 * `corte` marca un cambio de vara a mitad de la serie. Sin él, el gráfico se
 * dibuja exactamente como antes.
 */
export function GraficoLinea({
  titulo,
  meses,
  valores,
  formato,
  marcado,
  dominio,
  corte,
  alto = 160,
  chico = false,
}: {
  titulo: string;
  meses: string[];
  valores: (number | null)[];
  formato: (v: number) => string;
  marcado: string;
  dominio?: [number, number];
  corte?: CorteSerie;
  alto?: number;
  chico?: boolean;
}) {
  if (!hayDatos(valores)) return <SinDatoGrafico />;
  const marco: Marco = { ancho: chico ? 360 : 640, alto, izq: chico ? 48 : 64, n: Math.max(meses.length, 1) };
  const [min, max] = dominio ?? extremos(valores);
  const y = (v: number) => ARRIBA + ((max - v) / (max - min)) * alturaUtil(marco);
  const x = (i: number) => centro(marco, i);
  const ticks = [0, 1, 2].map((k) => min + ((max - min) * k) / 3);

  return (
    <svg viewBox={`0 0 ${marco.ancho} ${alto}`} width="100%" role="img" aria-label={titulo} className="block">
      <Fondo marco={marco} meses={meses} marcado={marcado} ticks={ticks} y={y} formato={formato} soloExtremos={chico} />
      {min < 0 && (
        <line x1={marco.izq} x2={marco.ancho - DER} y1={y(0)} y2={y(0)} strokeWidth={1.5} className="stroke-[var(--color-grafito)]" />
      )}
      <Linea valores={valores} iCorte={corte ? meses.indexOf(corte.mes) : -1} x={x} y={y} />
      {corte && <MarcaCorte marco={marco} meses={meses} corte={corte} />}
      {valores.map((v, i) => (
        <Punto
          key={i}
          valor={v}
          cx={x(i)}
          ancho={anchoColumna(marco)}
          y={y}
          marco={marco}
          tooltip={`${etiquetaMes(meses[i])} · ${v === null ? "sin dato" : formato(v)}`}
          rotulo={meses[i] === marcado && v !== null ? formato(v) : null}
        />
      ))}
    </svg>
  );
}
