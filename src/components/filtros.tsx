"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MES_TODO, etiquetaMes } from "@/lib/filtros";

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

/**
 * El filtro de fecha del tablero: "Todo" y un mes calendario.
 *
 * Es el MISMO control en las cinco pantallas. Cada una le pasa los meses que
 * ella tiene cargados, así nunca se ofrece un mes que va a salir vacío.
 *
 * `conTodo` en false lo usa Delivery: lo que publican las apps son cierres
 * mensuales, y "Todo" tendría que promediar agosto con julio.
 *
 * Con muchos meses una fila de botones no entra, así que a partir de seis pasa
 * a ser un `select`. Es el mismo filtro con otra forma, no otro filtro: hoy
 * son dos o tres meses y se ven todos de una.
 */
export function FiltroMeses({
  actual,
  meses,
  conTodo = true,
}: {
  actual: string;
  meses: string[];
  conTodo?: boolean;
}) {
  const cambiar = useCambiarParam();
  const opciones = conTodo ? [MES_TODO, ...meses] : meses;
  // Un solo mes y sin "Todo" no es una elección: no se dibuja el control.
  if (opciones.length <= 1) return null;

  // El default no se escribe en la URL: sin parámetros y con el default puesto
  // tienen que ser la misma dirección.
  const porDefecto = conTodo ? MES_TODO : meses[0];

  if (opciones.length > 6) {
    return (
      <select
        value={actual}
        onChange={(e) => cambiar("mes", e.target.value, e.target.value === porDefecto)}
        aria-label="Mes"
        className="rounded-lg border border-[var(--color-borde)] bg-white px-2.5 py-1.5 text-xs text-[var(--color-tinta)]"
      >
        {opciones.map((m) => (
          <option key={m} value={m}>
            {etiquetaMes(m)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Grupo>
      {opciones.map((m) => (
        <Boton key={m} activo={actual === m} onClick={() => cambiar("mes", m, m === porDefecto)}>
          {etiquetaMes(m)}
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

export function FiltroCanal({
  actual,
  canales,
}: {
  actual: string;
  canales: { id: string; nombre: string }[];
}) {
  const cambiar = useCambiarParam();
  return (
    <Grupo>
      {canales.map((c, i) => (
        <Boton
          key={c.id}
          activo={actual === c.id}
          onClick={() => cambiar("canal", c.id, i === 0)}
        >
          {c.nombre}
        </Boton>
      ))}
    </Grupo>
  );
}
