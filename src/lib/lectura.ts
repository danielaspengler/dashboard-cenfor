// UNA CONSULTA QUE FALLA NO ES UNA TABLA VACÍA
//
// Supabase no tira el error: devuelve `data` en null. Convertido a `[]`, la
// pantalla dice «sin auditar» o «local sin nombre», que son afirmaciones
// falsas: el dato existe, solo que no se pudo leer. Acá se corta la pantalla
// entera y `(panel)/error.tsx` dice lo que pasó.
//
// Una tabla que la RLS deja vacía —un mail sin autorización— no es un error:
// llega con `error` en null y sigue su camino.

type Resultado<T> = { data: T | null; error: { message: string } | null };

export function exigir<T>(resultado: Resultado<T>, tabla: string): T {
  if (resultado.error) {
    console.error(`${tabla}:`, resultado.error.message);
    throw new Error(`No se pudo leer ${tabla}: ${resultado.error.message}`);
  }
  return resultado.data ?? ([] as T);
}
