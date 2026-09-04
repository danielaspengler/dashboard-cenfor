import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MODO_DEMO } from "@/lib/demo";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Modo demostración: sin sesión ni chequeo de permisos, para poder mostrar
  // el tablero antes de que existan los usuarios. La franja de arriba está a
  // propósito: que nadie se olvide de que está encendido.
  if (MODO_DEMO) {
    return (
      <div className="flex min-h-screen">
        <Sidebar email={null} />
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <div className="bg-amber-100 px-7 py-1.5 text-center text-xs text-amber-900">
            Modo demostración — sin control de acceso. Apagar con{" "}
            <code className="font-mono">MODO_DEMO=0</code> antes de publicar.
          </div>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Si el mail dejó de estar autorizado, la RLS ya devuelve todo vacío. Lo
  // chequeamos igual para mostrar un mensaje claro en vez de un tablero
  // lleno de ceros, que se leería como "el negocio va mal".
  const { data: autorizado } = await supabase.rpc("esta_autorizado");

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Sin acceso</h1>
          <p className="mt-2 text-sm text-[var(--color-piedra)]">
            {user.email} no está habilitado para este tablero. Pedile a quien lo administra que
            te agregue.
          </p>
          <a href="/login" className="mt-4 inline-block text-sm underline underline-offset-4">
            Volver
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user.email ?? null} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
