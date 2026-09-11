import { MARCA } from "@/lib/marca";

// Página pública, fuera del guard de sesión: Google la pide para dejar
// publicar la app —sin una URL de política de privacidad válida, el botón
// "Publicar app" queda gris— y quien la lee todavía no inició sesión.
//
// Dice lo que la app hace de verdad. Una política copiada de una plantilla,
// con cláusulas sobre cookies de publicidad o venta de datos que acá no
// existen, es peor que no tenerla: el cliente la lee y no se entiende.

export const metadata = {
  title: `Política de privacidad · ${MARCA.nombre}`,
  description: `Qué datos usa el tablero de ${MARCA.nombre} y qué hace con ellos.`,
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="border-l-2 border-[var(--color-tinta)] pl-2.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-grafito)]">
        {titulo}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-[var(--color-tinta)]">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-14">
      <header className="space-y-1 border-b-2 border-[var(--color-tinta)] pb-4">
        <p className="text-xs uppercase tracking-wide text-[var(--color-piedra)]">
          {MARCA.nombre}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Política de privacidad</h1>
        <p className="text-sm text-[var(--color-piedra)]">Última actualización: 11/09/2026</p>
      </header>

      <Seccion titulo="Qué es este sitio">
        <p>
          Es el tablero de control interno de {MARCA.nombre}. Muestra indicadores de calidad y
          operación de sus locales: reseñas de Google, visitas de mystery shopper, auditorías
          presenciales y las métricas que publican las aplicaciones de delivery. No es un sitio
          público ni vende nada: entra solamente el equipo autorizado.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos personales usamos">
        <p>
          Al iniciar sesión con Google recibimos <strong>tu dirección de correo, tu nombre y tu
          foto de perfil</strong>. Nada más. No pedimos acceso a tu correo, a tus contactos, a
          tu calendario ni a tus archivos.
        </p>
        <p>
          Usamos esos datos para una sola cosa: verificar que tu dirección está en la lista de
          personas autorizadas y mostrarte con qué cuenta entraste. Si tu dirección no está en
          esa lista, no se crea ninguna cuenta y no se guarda nada.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos muestra el tablero">
        <p>
          Los indicadores operativos provienen de planillas de la propia empresa. Incluyen
          nombres de empleados evaluadores y auditores, y textos de reseñas publicados por
          clientes en Google y en las aplicaciones de delivery, tal como esas plataformas los
          publican.
        </p>
      </Seccion>

      <Seccion titulo="Con quién se comparten">
        <p>
          Con nadie. No vendemos ni cedemos datos, y no hay publicidad ni analítica de terceros
          en el sitio. Los datos se alojan en dos proveedores que solo actúan como
          infraestructura: Supabase (base de datos) y Vercel (hospedaje).
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo se conservan">
        <p>
          Los indicadores se conservan mientras el tablero esté en uso, porque su valor es
          justamente poder comparar un mes contra otro. Los datos de tu cuenta se eliminan
          cuando se te quita el acceso.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Podés pedir acceso a tus datos, su corrección o su eliminación escribiendo a{" "}
          <a className="underline" href="mailto:danispengler97@gmail.com">
            danispengler97@gmail.com
          </a>
          . Revocar el acceso de esta aplicación a tu cuenta de Google se hace en{" "}
          <a
            className="underline"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            la configuración de permisos de tu cuenta
          </a>
          .
        </p>
      </Seccion>

      <footer className="border-t border-[var(--color-borde)] pt-4 text-xs text-[var(--color-piedra)]">
        <a className="underline" href="/login">
          Volver al inicio de sesión
        </a>
      </footer>
    </main>
  );
}
