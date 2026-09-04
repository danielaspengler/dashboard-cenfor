import type { Metadata } from "next";
import "./globals.css";
import { MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: `${MARCA.nombre} · ${MARCA.bajada}`,
  description: "Tablero de control operativo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
