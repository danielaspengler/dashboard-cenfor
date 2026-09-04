import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ejecutarSync } from "@/lib/sync/ejecutar";
import { FUENTES, type Fuente } from "@/lib/sync/fuentes";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────
// UNA SOLA RUTA PARA LAS CUATRO FUENTES
//
// El maestro de Papanato tiene una ruta y un cron por fuente: diez en total.
// Acá no se puede. El plan gratuito de Vercel permite 2 ejecuciones de cron
// por día, así que el sync entero entra en una sola llamada y el cron es uno.
//
// Se puede correr una fuente sola con `?fuente=resenas` (o snapshots, mystery,
// auditorias) para reprocesar sin tocar el resto — sirve para depurar y para
// disparar a mano después de que el cliente corrige una planilla.
//
// Autenticación: el mismo Bearer CRON_SECRET del maestro. La ruta escribe con
// service_role, así que sin ese header no ejecuta nada.
// ─────────────────────────────────────────────────────────────────────────

function noAutorizado(request: Request): boolean {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return true; // sin secreto configurado, la ruta queda cerrada
  return request.headers.get("authorization") !== `Bearer ${esperado}`;
}

export async function GET(request: Request) {
  if (noAutorizado(request)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "falta SUPABASE_SERVICE_ROLE_KEY: el sync no puede escribir" },
      { status: 500 },
    );
  }

  const pedida = new URL(request.url).searchParams.get("fuente");
  if (pedida && !FUENTES.includes(pedida as Fuente)) {
    return NextResponse.json(
      { error: `fuente desconocida: «${pedida}»`, disponibles: FUENTES },
      { status: 400 },
    );
  }
  const fuentes: Fuente[] = pedida ? [pedida as Fuente] : [...FUENTES];

  const empezo = Date.now();
  const { locales, resultados } = await ejecutarSync(createAdminClient(), fuentes);

  const fallaron = resultados.filter((r) => !r.ok);
  const respuesta = {
    corridoEn: new Date().toISOString(),
    duracionMs: Date.now() - empezo,
    localesEnLaBase: locales,
    guardadas: resultados.reduce((n, r) => n + r.guardadas, 0),
    // Las descartadas se devuelven enteras y no solo contadas: son el aviso de
    // que una planilla cambió. Un contador en cero pasa desapercibido; el
    // detalle dice qué texto dejó de matchear.
    resultados,
  };

  // 207 cuando algunas fuentes anduvieron y otras no, para que un monitoreo
  // externo lo distinga de un sync limpio sin tener que leer el cuerpo.
  const estado = fallaron.length === 0 ? 200 : fallaron.length === resultados.length ? 500 : 207;
  return NextResponse.json(respuesta, { status: estado });
}
