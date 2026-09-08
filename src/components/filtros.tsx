"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PERIODOS, etiquetaMes } from "@/lib/filtros";

// Los únicos componentes de cliente del tablero, además del menú. Solo
// escriben el filtro en la URL: quien vuelve a calcular es el servidor.

function Grupo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-borde)] bg-white p-0.5">
      {children}
    </div>
  );
}

function Boton({
  activo,
  onClick,
  children,
  color,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
        activo
          ? "bg-[var(--color-tinta)] font-medium text-white"
          : "text-[var(--color-piedra)] hover:bg-[var(--color-hueso)]"
      }`}
    >
      {color && (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {children}
    </button>
  );
}

/** Cambia un parámetro y conserva los demás: los filtros se combinan. */
function useCambiarParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (clave: string, valor: string, esDefault: boolean) => {
    const nuevos = new URLSearchParams(params.toString());
    // El valor por defecto se saca de la URL en vez de escribirse: así la URL
    // sin parámetros y la URL con el default son la misma dirección.
    if (esDefault) nuevos.delete(clave);
    else nuevos.set(clave, valor);
    const qs = nuevos.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
}

export function FiltroPeriodo({ actual }: { actual: string }) {
  const cambiar = useCambiarParam();
  return (
    <Grupo>
      {PERIODOS.map((p) => (
        <Boton
          key={p.id}
          activo={actual === p.id}
          onClick={() => cambiar("periodo", p.id, p.id === "todo")}
        >
          {p.label}
        </Boton>
      ))}
    </Grupo>
  );
}

export function FiltroMarca({
  actual,
  marcas,
}: {
  actual: string;
  marcas: { slug: string; name: string; color: string }[];
}) {
  const cambiar = useCambiarParam();
  return (
    <Grupo>
      <Boton activo={actual === "todas"} onClick={() => cambiar("marca", "todas", true)}>
        Todas
      </Boton>
      {marcas.map((m) => (
        <Boton
          key={m.slug}
          activo={actual === m.slug}
          color={m.color}
          onClick={() => cambiar("marca", m.slug, false)}
        >
          {m.name}
        </Boton>
      ))}
    </Grupo>
  );
}

/**
 * Selector de mes de Delivery.
 *
 * Es un `select` y no botones como los otros filtros porque la lista crece un
 * mes por mes: hoy son dos, en un año son doce y una fila de botones no entra.
 */
export function FiltroMes({ actual, meses }: { actual: string; meses: string[] }) {
  const cambiar = useCambiarParam();
  if (meses.length <= 1) return null;

  return (
    <select
      value={actual}
      onChange={(e) => cambiar("mes", e.target.value, e.target.value === meses[0])}
      aria-label="Mes"
      className="rounded-lg border border-[var(--color-borde)] bg-white px-2.5 py-1.5 text-xs text-[var(--color-tinta)]"
    >
      {meses.map((m) => (
        <option key={m} value={m}>
          {etiquetaMes(m)}
        </option>
      ))}
    </select>
  );
}
