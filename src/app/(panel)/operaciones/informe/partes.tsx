import { SinDato } from "@/components/ui";

/** Un bloque con título, de los que se numeran en el documento. */
export function Bloque({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
          {titulo}
        </h2>
        {bajada && <p className="mt-1 pl-3 text-xs text-[var(--color-piedra)]">{bajada}</p>}
      </div>
      {children}
    </section>
  );
}

/** Una barra horizontal con el porcentaje adentro, para leer 9 filas de un vistazo. */
export function Barra({ pct, color }: { pct: number | null; color: string }) {
  if (pct === null) return <SinDato>—</SinDato>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-[var(--color-nube)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums">{pct.toFixed(1)}%</span>
    </div>
  );
}
