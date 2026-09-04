"use client";

import { createClient } from "@/lib/supabase/client";
import { MARCA } from "@/lib/marca";

// Mismo login que el maestro de Papanato: un botón, OAuth, sin contraseñas
// ni enlaces por correo. La única diferencia es el proveedor —Papanato usa
// Microsoft porque trabaja con Microsoft 365; CENFOR usa Google porque
// trabaja con Google Drive—. El resto de la cadena es idéntico:
// signInWithOAuth → /auth/callback (ruta de servidor) → exchangeCodeForSession.
//
// Por qué OAuth y no un enlace por correo, que fue lo primero que probamos:
// el flujo PKCE guarda una clave temporal en el navegador y la exige de
// vuelta. Con OAuth eso pasa en el mismo navegador y en segundos, así que
// funciona. Con un enlace por correo no: el enlace se abre después, desde
// otro contexto, y encima los escáneres de Gmail lo abren antes que la
// persona y lo queman —son de un solo uso—.

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "openid profile email",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-borde)] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{MARCA.nombre}</h1>
        <p className="mt-1 text-sm text-[var(--color-piedra)]">
          Entrá con tu cuenta de Google.
        </p>
        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-full bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Entrar con Google
        </button>
        <p className="mt-4 text-xs text-[var(--color-piedra)]">
          Solo los correos habilitados pueden acceder.
        </p>
      </div>
    </div>
  );
}
