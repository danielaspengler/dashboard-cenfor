"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";

// Lo que se ve cuando una consulta falla dos veces seguidas (`exigir`, en
// `lectura.ts`). Sin esto la pantalla mostraba «sin dato» donde el dato
// existía: un vacío que se lee como que el local no se midió.

export default function ErrorDelPanel({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  // `reset` solo vuelve a dibujar del lado del navegador; sin `refresh` las
  // consultas del servidor no se repiten y el botón no reintenta nada.
  const reintentar = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <>
      <PageHeader titulo="No se pudieron leer los datos" />
      <div className="p-7">
        <div className="max-w-xl rounded-xl border-2 border-[var(--color-tarjeta-borde)] bg-[var(--color-tarjeta)] p-7">
          <p className="text-sm">
            La conexión con la base falló mientras se armaba esta pantalla. Los datos están
            guardados: suele ser un corte momentáneo.
          </p>
          <button
            type="button"
            onClick={reintentar}
            className="mt-5 rounded-lg bg-[var(--color-tinta)] px-4 py-2 text-sm font-medium text-white"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    </>
  );
}
