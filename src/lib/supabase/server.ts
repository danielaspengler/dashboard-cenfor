import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para componentes de servidor. Lee con la sesión de la persona,
// así que la RLS decide qué ve: si su mail no está autorizado, las
// consultas devuelven vacío en vez de datos.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Desde un Server Component no se pueden escribir cookies; el
            // refresco de sesión ya lo hace el proxy.
          }
        },
      },
    },
  );
}
