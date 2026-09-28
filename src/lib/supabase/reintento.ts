// Tres veces una pantalla se dibujó con una consulta vacía —0 auditorías, 0
// locales— mientras las otras consultas de la misma pantalla andaban: un corte
// de red momentáneo contra Supabase. Un segundo intento lo absorbe.
//
// Solo se reintentan las lecturas. El cliente de servidor también escribe
// desde el sync, y repetir un POST que quizás llegó podría duplicar filas.

const ESPERA_MS = 300;

export const fetchConReintento: typeof fetch = async (entrada, init) => {
  const metodo = (init?.method ?? "GET").toUpperCase();
  if (metodo !== "GET" && metodo !== "HEAD") return fetch(entrada, init);

  try {
    const respuesta = await fetch(entrada, init);
    if (respuesta.status < 500) return respuesta;
  } catch {
    // Se cae al segundo intento: si también falla, ese error es el que sube.
  }
  await new Promise((r) => setTimeout(r, ESPERA_MS));
  return fetch(entrada, init);
};
