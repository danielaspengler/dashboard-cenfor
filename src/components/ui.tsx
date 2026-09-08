import { nivelDe } from "@/lib/marca";

export function PageHeader({
  titulo,
  bajada,
  extra,
}: {
  titulo: string;
  bajada?: string;
  extra?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between border-b border-[var(--color-borde)] bg-white px-7 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {bajada && <p className="mt-0.5 text-sm text-[var(--color-piedra)]">{bajada}</p>}
      </div>
      {extra}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--color-borde)] bg-white p-5 ${className}`}>
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
      <div className="text-xs uppercase tracking-wide text-[var(--color-piedra)]">{etiqueta}</div>
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

export function Puntaje({ pct }: { pct: number | null | undefined }) {
  const nivel = nivelDe(pct);
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
    <div className="overflow-x-auto rounded-xl border border-[var(--color-borde)] bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-[var(--color-borde)] px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-[var(--color-piedra)] ${className}`}
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
 * Variación contra el período anterior, en puntos porcentuales.
 *
 * El color no lo decide el signo: en cancelaciones o reclamos bajar es bueno
 * y en disponibilidad es malo. De ahí `mejorSiBaja`. Una variación de menos
 * de una décima se muestra como "sin cambios" en vez de un 0,0 con flecha,
 * que se lee como un movimiento que no existió.
 */
export function Variacion({
  delta,
  mejorSiBaja = false,
  unidad = "pts",
  contra,
}: {
  delta: number | null;
  mejorSiBaja?: boolean;
  unidad?: string;
  contra: string;
}) {
  if (delta === null) return null;
  if (Math.abs(delta) < 0.1)
    return <span className="text-[var(--color-piedra)]">sin cambios vs {contra}</span>;

  const bien = mejorSiBaja ? delta < 0 : delta > 0;
  return (
    <span style={{ color: bien ? "#15803d" : "#b91c1c" }}>
      {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} {unidad} vs {contra}
    </span>
  );
}

const PESOS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function pesos(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return `$ ${PESOS.format(valor)}`;
}

/** Porcentaje sin semáforo: delivery todavía no tiene umbrales del cliente. */
export function Pct({ valor }: { valor: number | null | undefined }) {
  if (valor === null || valor === undefined) return <SinDato>—</SinDato>;
  return <span className="tabular-nums">{valor.toFixed(1)}%</span>;
}
