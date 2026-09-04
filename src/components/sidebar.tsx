"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAVIGATION } from "@/lib/navigation";
import { MARCA } from "@/lib/marca";
import { createClient } from "@/lib/supabase/client";

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();

  // El menú arrastra los filtros de una pantalla a la otra. Elegir "90 días"
  // y perderlo al cambiar de sección obligaría a volver a elegirlo en cada
  // una, que es justo lo contrario de recorrer un período.
  const qs = useSearchParams().toString();
  const conFiltros = (href: string) => (qs ? `${href}?${qs}` : href);

  async function salir() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-[var(--color-borde)] bg-white">
      <div className="border-b border-[var(--color-borde)] px-5 py-4">
        <div className="text-lg font-semibold tracking-tight">{MARCA.nombre}</div>
        <div className="text-xs text-[var(--color-piedra)]">{MARCA.bajada}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {NAVIGATION.map((area) => (
          <div key={area.slug} className="mb-5">
            <div className="mb-1 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-[var(--color-piedra)]">
              <area.icon size={13} />
              {area.label}
              {area.status === "proximamente" && (
                <span className="ml-auto text-[10px] normal-case">Próximamente</span>
              )}
            </div>

            {area.sections.map((s) => {
              const activa = pathname === s.href;
              return (
                <Link
                  key={s.href}
                  href={conFiltros(s.href)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    activa
                      ? "bg-[var(--color-tinta)] text-white"
                      : "text-[var(--color-tinta)] hover:bg-[var(--color-hueso)]"
                  }`}
                >
                  <s.icon size={15} />
                  {s.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--color-borde)] px-4 py-3">
        {email ? (
          <>
            <div className="truncate text-xs text-[var(--color-piedra)]" title={email}>
              {email}
            </div>
            <button onClick={salir} className="mt-1 text-xs underline underline-offset-4">
              Cerrar sesión
            </button>
          </>
        ) : (
          <div className="text-xs text-[var(--color-piedra)]">Demostración</div>
        )}
      </div>
    </nav>
  );
}
