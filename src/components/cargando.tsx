// Lo que se ve apenas se hace clic en el menú, mientras el servidor arma la
// pantalla. Sin esto el clic no mostraba nada hasta tener la pantalla entera
// y el tablero parecía colgado.
//
// Lo usan los `loading.tsx` de (panel), operaciones y administracion. Hace
// falta uno en cada carpeta: Next solo muestra el de la carpeta que está justo
// encima del segmento que cambia, y entre dos secciones de Operaciones la que
// cambia es la de la sección, no la del área.

function Bloque({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--color-tarjeta-borde)]/60 ${className}`} />;
}

export function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <header className="border-b-2 border-[var(--color-tinta)] bg-white px-7 py-6">
        <Bloque className="h-8 w-72" />
        <Bloque className="mt-2 h-4 w-96 max-w-full" />
      </header>
      <div className="space-y-8 p-7">
        <div className="grid gap-5 md:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <Bloque key={k} className="h-28" />
          ))}
        </div>
        <Bloque className="h-6 w-56" />
        <Bloque className="h-72" />
      </div>
    </div>
  );
}
