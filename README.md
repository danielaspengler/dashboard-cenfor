# Dashboard CENFOR

Tablero de control operativo para CENFOR: dos marcas (**Censurado**, 7 locales y
**Formaggio**, 3) y diez locales en total. Lee las planillas de Google Drive del cliente,
las guarda en Supabase y las muestra.

Next.js 16 · Supabase · Tailwind 4.

## Arrancar

```bash
cp .env.local.example .env.local   # y completar las claves que faltan
npm install
npx next dev --port 3100
```

El puerto 3100 y no el 3000: el 3000 lo ocupa otro proyecto.

> En la máquina donde se desarrolla hoy, `next dev` falla al compilar `globals.css`
> (Turbopack no puede lanzar el proceso de PostCSS). Mientras tanto:
> `npx next build && npx next start --port 3100`.

## Cómo entra el dato

Cuatro planillas de Google Drive, leídas con una cuenta de servicio de solo lectura:
reseñas de Google, mystery shopper de Censurado, mystery shopper de Formaggio y auditorías
presenciales.

```
src/lib/parsers/   funciones puras: reciben filas, devuelven objetos
src/lib/sync/      leer + parsear + escribir en Supabase
src/app/api/sync/  la ruta que dispara todo
```

**Una sola ruta para las cuatro fuentes**, no una por fuente: el plan gratuito de Vercel
permite 2 crons por día. `vercel.json` deja uno diario.

```bash
# el sync entero
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/sync
# una sola fuente
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3100/api/sync?fuente=resenas"
```

Los parsers buscan las columnas **por nombre de encabezado, no por posición**: si alguien
inserta una columna en la planilla, un parser posicional empieza a leer el dato equivocado
sin dar error.

## Probar sin tocar nada

```bash
npm run probar-parsers   # qué leen los parsers de las planillas vivas
npm run ensayo-sync      # el sync completo en seco, con un Supabase falso
```

`ensayo-sync` verifica lo que más se puede romper —que cada texto de planilla encuentre su
local— sin necesitar la `service_role` key ni escribir en la base.

## Criterios que no son decisiones de diseño

- **Los umbrales vienen de la planilla del cliente**: ≥90 Excelente · ≥75 Bueno · ≥60
  Regular. El dashboard se adapta a su criterio, no al revés.
- **El promedio de Google va ponderado por cantidad de reseñas.** Un local con 245 reseñas
  pesa más que uno con 13.
- **Lo que no existe se dice, no se pinta de cero.** Un local sin ficha de Google sale "sin
  ficha"; Formaggio sale "no aplica" en auditorías. Un cero se lee como "va mal".
- **Ningún local se identifica solo por su nombre.** "Nueva Córdoba" existe en las dos
  marcas: siempre marca + local.

## Acceso

Una tabla `emails_autorizados`, sin roles: quien está, ve todo; quien no, no entra. Dos
capas — un trigger sobre `auth.users` rechaza el alta y todas las policies de RLS preguntan
por la misma lista.

`MODO_DEMO=1` saltea el guard para poder mostrar el tablero sin usuarios creados. **Nunca en
producción**; la app muestra una franja de aviso mientras está encendido.

## Documentación

El detalle del proyecto —estado, decisiones y pendientes— vive fuera de este repo, en
`HOLT/CENFOR/proyecto-dashboard/`: `HANDOFF.md`, `BLUEPRINT.md`, `MAPA-DE-FUENTES.md` y
`LOCALES.md`.
