import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: SALTEA la RLS. Solo para las rutas de sync,
// que son las únicas que escriben. Nunca importar esto desde un componente
// que llegue al navegador.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
