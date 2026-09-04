import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────
// MODO DEMOSTRACIÓN
//
// Se enciende con MODO_DEMO=1 en .env.local. Sirve para mostrar el tablero
// en una reunión antes de que existan los usuarios: el guard de sesión no
// pide login y las consultas leen con la clave de servidor.
//
// Por qué así y no abriendo permisos de lectura pública en la base:
// una policy para `anon` deja los datos del cliente accesibles a cualquiera
// que tenga la URL del proyecto y la clave publicable —que viaja en el
// código del navegador—. El maestro de Papanato pasó exactamente por eso:
// tuvo una migración `dev_temp_anon_read_TEMPORAL` y después hubo que
// cerrar la fuga. Acá la puerta de la base nunca se abre: la clave de
// servidor vive solo en .env.local, que no va al repo.
//
// AUN ASÍ, ESTO NO VA A PRODUCCIÓN. Con MODO_DEMO=1 cualquiera que llegue
// a la URL ve todo. Es para localhost y para una reunión, nada más.
// ─────────────────────────────────────────────────────────────────────────

export const MODO_DEMO = process.env.MODO_DEMO === "1";

/**
 * El cliente con el que leen las pantallas.
 *
 * Normal: la sesión de la persona, así la RLS decide qué ve.
 * Demo: la clave de servidor, que saltea la RLS porque no hay sesión.
 */
export async function clienteDeLectura() {
  if (MODO_DEMO) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "MODO_DEMO está encendido pero falta SUPABASE_SERVICE_ROLE_KEY en .env.local. " +
          "Se saca de Supabase → Settings → API → service_role.",
      );
    }
    return createAdminClient();
  }
  return createServerSupabaseClient();
}
