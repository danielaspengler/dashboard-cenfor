import { nivelAuditoria, nivelDe } from "@/lib/marca";

export function PageHeader({
  titulo,
  bajada,
  extra,
}: {
  titulo: string;
  bajada?: string;
  extra?: React.ReactNode;
}) {
  // La franja del título se despega del cuerpo: fondo blanco sobre el hueso de
  // la página, borde inferior de 2px y una barra de acento a la izquierda del
  // título. Es la única zona de la pantalla que dice dónde estás.
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--color-tinta)] bg-white px-7 py-6">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-7 w-1 shrink-0 rounded-full bg-[var(--color-tinta)]" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {bajada && <p className="mt-0.5 text-sm text-[var(--color-piedra)]">{bajada}</p>}
        </div>
      </div>
      {extra}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border-2 border-[var(--color-borde)] bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Dato({
  etiqueta,
  valor,
  detalle,
  color,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  detalle?: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]">
        {etiqueta}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {valor}
      </div>
      {detalle && <div className="text-xs text-[var(--color-piedra)]">{detalle}</div>}
    </div>
  );
}

/** Un valor que no existe se dice, no se pinta de cero. */
export function SinDato({ children = "Sin datos" }: { children?: React.ReactNode }) {
  return <span className="text-sm italic text-[var(--color-piedra)]">{children}</span>;
}

/**
 * Un puntaje pintado con el semáforo que le corresponde.
 *
 * `escala` existe porque las dos fuentes usan cortes distintos, y los dos
 * salen de la planilla del cliente: mystery shopper clasifica en cuatro
 * niveles (90/75/60) y la auditoría en cinco (95/90/70/50). Pintar una
 * auditoría con los cortes de la otra es inventar un criterio.
 */
export function Puntaje({
  pct,
  escala = "mystery",
}: {
  pct: number | null | undefined;
  escala?: "mystery" | "auditoria";
}) {
  const nivel = escala === "auditoria" ? nivelAuditoria(pct) : nivelDe(pct);
  if (pct === null || pct === undefined || !nivel) return <SinDato>—</SinDato>;
  return (
    <span className="font-semibold tabular-nums" style={{ color: nivel.color }}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function Etiqueta({ texto, color }: { texto: string; color: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {texto}
    </span>
  );
}

/** Aviso para las visitas cuyo puntaje la planilla marcó como mal calculado. */
export function EnRevision() {
  return (
    <span
      className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
      title="La planilla marcó este puntaje como mal calculado. Se muestra, pero no entra en ningún promedio."
    >
      En revisión
    </span>
  );
}

export function Tabla({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-[var(--color-borde)] bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

/**
 * El encabezado de una columna.
 *
 * La fila de títulos va sobre fondo propio y con el borde de abajo más
 * marcado: en una tabla de catorce columnas hay que poder volver al encabezado
 * sin buscarlo.
 */
export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b-2 border-[var(--color-borde)] bg-[var(--color-nube)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-grafito)] ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b border-[var(--color-borde)] px-4 py-2.5 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Variación contra el período anterior.
 *
 * El color no lo decide el signo: en cancelaciones o reclamos bajar es bueno
 * y en disponibilidad es malo. De ahí `mejorSiBaja`. Una variación de menos
 * de una décima se muestra como "sin cambios" en vez de un 0,0 con flecha,
 * que se lee como un movimiento que no existió.
 *
 * `escribir` la escribe con la unidad del indicador. Sin eso, la caída de la
 * hora no disponible salía como "▼ 7.8 pts" —que no son puntos, son minutos—
 * y la del contracargo como "▼ 19585.0", que no son ni pesos ni nada.
 * "Puntos" es el default porque la mayoría de los indicadores son tasas.
 */
export function Variacion({
  delta,
  mejorSiBaja = false,
  escribir = (n) => `${n.toFixed(1)} pts`,
  contra,
}: {
  delta: number | null;
  mejorSiBaja?: boolean;
  escribir?: (n: number) => string;
  contra: string;
}) {
  if (delta === null) return null;
  if (Math.abs(delta) < 0.1)
    return <span className="text-[var(--color-piedra)]">sin cambios vs {contra}</span>;

  const bien = mejorSiBaja ? delta < 0 : delta > 0;
  return (
    <span style={{ color: bien ? "#15803d" : "#b91c1c" }}>
      {delta > 0 ? "▲" : "▼"} {escribir(Math.abs(delta))} vs {contra}
    </span>
  );
}

