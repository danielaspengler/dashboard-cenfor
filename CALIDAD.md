# El estándar de calidad

> El objetivo del arnés es **el código de mayor calidad posible.** Estas reglas las respetan
> los tres roles, en liviana y en pesada. No son sugerencias: son la vara.

## Los 4 principios (Karpathy)

1. **Pensá antes de codear.** Surfaceá suposiciones, mostrá tradeoffs, preguntá si hay
   ambigüedad. Nunca asumas en silencio.
2. **Simplicidad primero.** El código mínimo que resuelve el problema de HOY. No abstraigas
   antes de tiempo. Una función simple > un patrón de diseño innecesario.
3. **Cambios quirúrgicos.** Tocá SOLO lo necesario. No refactorices lo que no te pidieron. No
   cambies el estilo del código ajeno.
4. **Ejecución orientada a metas.** Definí criterios de éxito verificables ANTES de implementar.
   Avanzá incremental y verificá en cada paso.

## Reglas de código (no negociables)

- **Tipos siempre, `any` nunca.** En TypeScript usá `unknown` y reducí. Interfaces para objetos.
- **Tamaños:** archivos ≤ 500 líneas, funciones ≤ 50. Si crece, partilo.
- **Escribí como el código que te rodea:** nombres, densidad de comentarios e idioma del proyecto.
  El código nuevo debe parecer del mismo autor.
- **Comentá el porqué, no el qué.** Solo lo no obvio. Nada de comentarios que repiten el código.
- **Validá toda entrada.** Nada entra a la lógica sin validarse (esquema/validador).
- **Nunca expongas ni loguees secretos.** Claves solo en variables de entorno, solo en servidor.
- **Seguridad de datos en dos capas** cuando aplique: chequeo en el servidor **y** política en la
  base (RLS/roles). El filtro en el código es comodidad, no seguridad.
- **La marca no se hardcodea.** Las apps del kit apuntan a marca blanca: nombre, logo, colores y
  textos de marca salen de UN solo lugar de configuración (ej. `src/lib/marca.ts`), nunca
  sueltos en componentes. Un cliente nuevo = cambiar la config, no cazar textos por el código.
- **Todo cambio de esquema es una migración versionada.** Además de aplicarse a la base, el SQL
  se guarda como archivo en `supabase/migrations/` (formato `YYYYMMDDHHMMSS_nombre.sql`). La
  base de un cliente nuevo se recrea corriendo esos archivos en orden — nunca reconstruyendo a
  mano lo que se hizo por chat.

## Prohibido (rompe la entrega)

- ❌ `// ...`, `// rest of code`, `// TODO` en el código que se entrega.
- ❌ Describir el código en vez de escribirlo.
- ❌ `any` en TypeScript.
- ❌ Declarar "listo" sin verificar contra la realidad.
- ❌ Refactorizar de más "ya que estoy".
- ❌ Dependencias sin verificar (revisá el paquete antes de instalarlo).
- ❌ Cambiar el esquema de la base sin dejar el archivo de migración en `supabase/migrations/`.
- ❌ Hardcodear la marca del cliente (nombre/colores/textos) en código nuevo.

## La regla de oro: "listo" tiene una definición

Nadie declara una feature terminada "de palabra". **Listo significa:**

- `./init.sh` pasa.
- `npm run typecheck` (o el typecheck del proyecto) pasa.
- Los tests pasan.
- Si hay UI, se ejercitó en un navegador real (Playwright) — golden path + bordes.
- Si algo no se pudo probar, **se dice explícito.** No se disfraza de "listo".

Esa verificación es trabajo del **revisor**. El implementador nunca se autodeclara listo.

## Auto-blindaje (el proceso mejora solo)

Cuando aparece un error y se arregla, se **documenta** para que no vuelva a pasar:

```
Error ocurre → se arregla → se DOCUMENTA → nunca ocurre de nuevo
```

Dónde documentarlo:
- Si es de esta feature → en su `specs/C{n}-{slug}/` o en la bitácora `progress/YYYY-MM-DD-{slug}.md`.
- Si es un patrón que afecta a todo el proyecto → en el `CLAUDE.md` del proyecto.
- Si es una mejora del método en sí → en `la-cocina/plantilla-arnes/` (la fuente canónica)
  y de ahí a las copias de las apps.

Así el arnés se vuelve más sólido con cada tropiezo, en vez de repetir el mismo error.

---

*Planificá primero. Construí con confianza. No rompas lo que ya funciona.*
