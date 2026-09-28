"use client";

import { useState } from "react";

// A4 en milímetros y el ancho con el que se dibuja cada hoja antes de la foto:
// 794 px son los 210 mm de una A4 a 96 dpi, así el informe se acomoda igual
// que en papel, sea cual sea el ancho de la pantalla desde la que se baja.
const A4 = { ancho: 210, alto: 297 };
const MARGEN = 12;
const ANCHO_HOJA_PX = 794;

/**
 * El botón que arma el PDF en el navegador y lo baja directo, en color.
 *
 * Antes abría el diálogo de impresión: había que elegir «Guardar como PDF» y,
 * con una impresora en blanco y negro elegida, salía en grises. Ahora cada
 * hoja del informe (`[data-hoja]`) se fotografía y va a su propia página A4.
 * El costo: el PDF es una imagen, el texto no se puede seleccionar.
 *
 * En el servidor sigue sin armarse: en el plan Hobby de Vercel una función con
 * Chromium adentro no entra.
 */
export function BotonImprimir({ archivo, pie }: { archivo: string; pie: string }) {
  const [armando, setArmando] = useState(false);

  async function descargar() {
    setArmando(true);
    try {
      // Se cargan recién al apretar: son pesadas y solo las usa este botón.
      const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const hojas = [...document.querySelectorAll<HTMLElement>("[data-hoja]")];
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const util = { ancho: A4.ancho - 2 * MARGEN, alto: A4.alto - 2 * MARGEN - 6 };

      for (const [i, hoja] of hojas.entries()) {
        // La hoja real se angosta al ancho de una A4 mientras se toma la foto:
        // html-to-image copia los anchos ya calculados, así que angostar solo
        // la copia deja el contenido cortado a la derecha.
        const anchoOriginal = hoja.style.width;
        hoja.style.width = `${ANCHO_HOJA_PX}px`;
        await new Promise(requestAnimationFrame);
        let imagen: string;
        try {
          // JPEG y no PNG: con PNG las tres hojas pesaban 19,5 MB, demasiado para un mail.
          imagen = await toJpeg(hoja, { pixelRatio: 2, quality: 0.85, backgroundColor: "#ffffff" });
        } finally {
          hoja.style.width = anchoOriginal;
        }
        const { width, height } = pdf.getImageProperties(imagen);
        // Entra a lo ancho; si una hoja sale más larga que la página, se achica entera.
        const escala = Math.min(util.ancho / width, util.alto / height);
        if (i > 0) pdf.addPage();
        pdf.addImage(imagen, "JPEG", MARGEN, MARGEN, width * escala, height * escala);
        pdf.setFontSize(7);
        pdf.setTextColor(138, 138, 132);
        pdf.text(`${pie} · hoja ${i + 1} de ${hojas.length}`, MARGEN, A4.alto - MARGEN + 2);
      }
      pdf.save(archivo);
    } finally {
      setArmando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={armando}
      className="rounded-lg bg-[var(--color-tinta)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {armando ? "Armando el PDF…" : "Descargar PDF"}
    </button>
  );
}
