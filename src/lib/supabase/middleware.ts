import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Misma estructura que el maestro de Papanato (src/lib/supabase/middleware.ts).
//
// /api/sync/* y /api/cron/* tienen su propio candado (CRON_SECRET), no sesión
// de usuario — los dispara el cron de Vercel, no una persona logueada.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/sync", "/api/cron"];

export async function updateSession(request: NextRequest) {
  // Modo demostración: se enciende con MODO_DEMO=1 en .env.local y salta el
  // guard para poder mostrar el tablero sin usuarios creados. NUNCA debe
  // quedar encendido en producción — ver el aviso en src/lib/demo.ts.
  if (process.env.MODO_DEMO === "1") {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
