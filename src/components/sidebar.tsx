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
    // Fijo a la altura de la ventana: si se estira con la página, el pie con el
    // mail y «Cerrar sesión» queda al final de todo el scroll y nadie lo ve.
    <nav className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-[var(--color-menu)] text-[var(--color-menu-texto)]">
      <div className="border-b border-[var(--color-menu-linea)] px-5 py-4">
        <div className="text-lg font-semibold tracking-tight">{MARCA.nombre}</div>
        <div className="text-xs text-[var(--color-menu-tenue)]">{MARCA.bajada}</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {NAVIGATION.map((area) => (
          <div key={area.slug} className="mb-5">
            <div className="mb-1 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-[var(--color-menu-tenue)]">
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
                      ? "bg-[var(--color-menu-texto)] font-medium text-[var(--color-menu)]"
                      : "hover:bg-[var(--color-menu-hover)]"
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

      <div className="border-t border-[var(--color-menu-linea)] px-4 py-3">
        {email ? (
          <>
            <div className="truncate text-xs text-[var(--color-menu-tenue)]" title={email}>
              {email}
            </div>
            <button onClick={salir} className="mt-1 text-xs underline underline-offset-4">
              Cerrar sesión
            </button>
          </>
        ) : (
          <div className="text-xs text-[var(--color-menu-tenue)]">Demostración</div>
        )}
      </div>
    </nav>
  );
}
