import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para el navegador. Usa la clave publicable: es segura
// de exponer, la seguridad la da la RLS en la base de datos.
//
// Sin opciones: el flujo por defecto (PKCE) es el correcto para OAuth, donde
// la ida y la vuelta pasan en el mismo navegador y en segundos. Es lo que
// usa el maestro de Papanato.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
