"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LOCAL_TODOS, MES_TODO, etiquetaMes } from "@/lib/filtros";

// Los únicos componentes de cliente del tablero, además del menú. Solo
// escriben el filtro en la URL: quien vuelve a calcular es el servidor.

function Grupo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-borde)] bg-white p-0.5">
      {children}
    </div>
  );
}

// Los dos desplegables del tablero —fecha y local— se ven igual.
const CLASE_SELECT =
  "rounded-lg border border-[var(--color-borde)] bg-white px-2.5 py-1.5 text-xs text-[var(--color-tinta)]";

/**
 * Un desplegable con su rótulo al lado.
 *
 * Sin el rótulo, "Agosto 2026" y "Todos los locales" son dos cajas iguales y
 * hay que abrirlas para saber qué filtran. El `label` envuelve al `select`, así
 * que el texto también es zona de clic.
 */
function Desplegable({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]">
        {rotulo}
      </span>
      {children}
    </label>
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
 * Es un desplegable siempre, incluso con dos meses cargados. Antes eran botones
 * hasta seis meses y `select` de ahí en adelante: el control cambiaba de forma
 * solo, y en un tablero que acumula un mes por mes esa forma dura poco. Con el
 * desplegable el filtro se ve igual desde la primera corrida hasta la número
 * treinta, y ocupa lo mismo al lado del canal y el local.
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

  return (
    <Desplegable rotulo="Fecha">
      <select
        value={actual}
        onChange={(e) => cambiar("mes", e.target.value, e.target.value === porDefecto)}
        aria-label="Fecha"
        className={CLASE_SELECT}
      >
        {opciones.map((m) => (
          <option key={m} value={m}>
            {etiquetaMes(m)}
          </option>
        ))}
      </select>
    </Desplegable>
  );
}

/**
 * El filtro de local de Delivery.
 *
 * Va en `select` y no en botones: son hasta diez locales y una fila de
 * botones no entra al lado del canal y el mes.
 *
 * Cada opción dice cuántos puntos de venta junta, porque es la pregunta que
 * sigue: en Rappi, Urca son tres tiendas y Poeta Lugones una sola.
 */
export function FiltroLocal({
  actual,
  locales,
}: {
  actual: string;
  locales: { slug: string; nombre: string; puntos: number }[];
}) {
  const cambiar = useCambiarParam();
  // Un solo local no es una elección: no se dibuja el control.
  if (locales.length <= 1) return null;

  return (
    <Desplegable rotulo="Local">
      <select
        value={actual}
        onChange={(e) => cambiar("local", e.target.value, e.target.value === LOCAL_TODOS)}
        aria-label="Local"
        className={CLASE_SELECT}
      >
        <option value={LOCAL_TODOS}>Todos los locales</option>
        {locales.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.nombre} ({l.puntos})
          </option>
        ))}
      </select>
    </Desplegable>
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
