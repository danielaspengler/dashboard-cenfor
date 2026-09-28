"use client";

import { useState } from "react";
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
 * Botones de año y un desplegable con los meses de ese año. Con veinte meses
 * cargados, una sola lista de ene 2025 a sep 2026 era larga de recorrer. El año
 * es un atajo para encontrar el mes, NO un período: apretarlo no cambia los
 * números, solo qué meses ofrece la lista (decisión de Daniela, 28/09/2026).
 * Con un solo año cargado no hay botones de año.
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
  // El año que se apretó y todavía no tiene mes elegido. Mientras es null, el
  // año visible es el del mes de la URL.
  const [anioElegido, setAnioElegido] = useState<string | null>(null);

  // Un solo mes y sin "Todo" no es una elección: no se dibuja el control.
  if ((conTodo ? meses.length + 1 : meses.length) <= 1) return null;

  // El default no se escribe en la URL: sin parámetros y con el default puesto
  // tienen que ser la misma dirección.
  const porDefecto = conTodo ? MES_TODO : meses[0];
  const anios = [...new Set(meses.map((m) => m.slice(0, 4)))].sort();
  const anioVisto =
    anioElegido ??
    (actual !== MES_TODO ? actual.slice(0, 4) : anios.length === 1 ? anios[0] : null);
  const delAnio = meses.filter((m) => m.startsWith(anioVisto ?? "-")).sort();
  const enTodo = actual === MES_TODO && anioElegido === null;

  const elegirMes = (m: string) => {
    setAnioElegido(null);
    cambiar("mes", m, m === porDefecto);
  };

  // Un div y no el `label` de `Desplegable`: un label con botones adentro
  // manda el clic de su rótulo al primero, que es "Todo".
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-grafito)]">
        Fecha
      </span>
      {(conTodo || anios.length > 1) && (
        <Grupo>
          {conTodo && (
            <Boton activo={enTodo} onClick={() => elegirMes(MES_TODO)}>
              Todo
            </Boton>
          )}
          {anios.length > 1 &&
            anios.map((a) => (
              <Boton key={a} activo={!enTodo && anioVisto === a} onClick={() => setAnioElegido(a)}>
                {a}
              </Boton>
            ))}
        </Grupo>
      )}
      {anioVisto && (
        <select
          value={delAnio.includes(actual) ? actual : ""}
          onChange={(e) => elegirMes(e.target.value)}
          aria-label="Mes"
          className={CLASE_SELECT}
        >
          {!delAnio.includes(actual) && (
            <option value="" disabled>
              Elegí un mes
            </option>
          )}
          {delAnio.map((m) => (
            <option key={m} value={m}>
              {etiquetaMes(m).split(" ")[0]}
            </option>
          ))}
        </select>
      )}
    </div>
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

/**
 * Un desplegable genérico sobre un parámetro de la URL.
 *
 * Lo usa el informe para elegir el local entre los diez, donde no sirve el
 * filtro de Delivery: ese ofrece solo los locales que venden por apps y
 * cuenta sus puntos de venta.
 *
 * `porDefecto`: si se elige ese valor, el parámetro se borra de la URL en vez
 * de escribirse. El informe no lo pasa: ahí el local siempre va en la URL.
 */
export function FiltroOpciones({
  rotulo,
  param,
  actual,
  opciones,
  porDefecto,
}: {
  rotulo: string;
  param: string;
  actual: string;
  opciones: { valor: string; etiqueta: string }[];
  porDefecto?: string;
}) {
  const cambiar = useCambiarParam();
  if (opciones.length <= 1) return null;
  return (
    <Desplegable rotulo={rotulo}>
      <select
        value={actual}
        onChange={(e) => cambiar(param, e.target.value, e.target.value === porDefecto)}
        aria-label={rotulo}
        className={CLASE_SELECT}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
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
