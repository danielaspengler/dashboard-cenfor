"use client";

/**
 * El botón que abre el diálogo de impresión del navegador.
 *
 * El PDF no se arma en el servidor: en el plan Hobby de Vercel una función con
 * Chromium adentro no entra, y un servicio externo sumaría otra cuenta y otro
 * secreto para un documento de tres hojas. El costo es que el informe sale con
 * el diálogo del navegador en el medio —hay que elegir «Guardar como PDF»—, y
 * la ventaja es que lo que se imprime es exactamente lo que se ve.
 */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[var(--color-tinta)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
    >
      Descargar PDF
    </button>
  );
}
