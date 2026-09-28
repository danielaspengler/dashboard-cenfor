import { Agent } from "undici";

// UNA LECTURA QUE FALLA AL AZAR
//
// Cinco veces una pantalla se dibujó con una consulta caída mientras las
// otras de la misma pantalla andaban. La causa, vista en el log el 28/09/2026:
// «JWT issued at future». Con las claves nuevas de Supabase (sb_secret_… y
// sb_publishable_…) el gateway emite un JWT por pedido, y cuando el reloj del
// nodo que atiende va adelante del de la base, esta lo rechaza con un 401.
//
// Esperar no alcanza: Node reusa la conexión, el reintento cae en el MISMO
// nodo y sale con el mismo reloj adelantado (tres intentos en tres segundos
// fallaron igual). Por eso cada reintento sale por una conexión nueva, que el
// balanceador puede mandar a otro nodo. curl, que abre una conexión por
// pedido, nunca vio el error en 55 pruebas.
//
// También se cubre el corte de red y el 5xx, que son el mismo tipo de falla.
//
// Solo se reintentan las lecturas. El cliente de servidor también escribe
// desde el sync, y repetir un POST que quizás llegó podría duplicar filas.

const ESPERAS_MS = [300, 1000];

async function esPasajera(respuesta: Response): Promise<boolean> {
  if (respuesta.status >= 500) return true;
  if (respuesta.status !== 401) return false;
  const cuerpo = await respuesta.clone().text();
  return cuerpo.includes("JWT issued at future");
}

/** Un pedido por una conexión que no se reusa ni se guarda. */
function porConexionNueva(entrada: Parameters<typeof fetch>[0], init?: RequestInit) {
  const agente = new Agent({ keepAliveTimeout: 1, keepAliveMaxTimeout: 1 });
  return fetch(entrada, { ...init, dispatcher: agente } as RequestInit);
}

export const fetchConReintento: typeof fetch = async (entrada, init) => {
  const metodo = (init?.method ?? "GET").toUpperCase();
  if (metodo !== "GET" && metodo !== "HEAD") return fetch(entrada, init);

  let intento = (): Promise<Response> => fetch(entrada, init);
  for (const espera of ESPERAS_MS) {
    try {
      const respuesta = await intento();
      if (!(await esPasajera(respuesta))) return respuesta;
    } catch {
      // Corte de red: se prueba de nuevo. Si el último intento también falla,
      // ese error es el que sube.
    }
    await new Promise((r) => setTimeout(r, espera));
    intento = () => porConexionNueva(entrada, init);
  }
  return intento();
};
