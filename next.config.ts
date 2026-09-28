import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Volver a una sección ya visitada la muestra desde el navegador, sin ir
    // al servidor, durante 5 minutos. Los datos cambian una vez por día (el
    // sync de las 5:00), así que 5 minutos no esconden nada; recargar la
    // página trae todo fresco igual. Sin esto, cada clic del menú volvía a
    // armar la pantalla entera.
    staleTimes: { dynamic: 300 },
  },
};

export default nextConfig;
