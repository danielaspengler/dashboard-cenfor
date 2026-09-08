# Estado actual — Dashboard CENFOR

> Esto es lo PRIMERO que se lee al retomar. Snapshot del ahora, no historia.
> Se reescribe al cerrar cada sesión. La historia comprimida va en `HISTORY.md`.
>
> **Fuente de verdad:** `features.json` (qué falta) · `specs/` (receta por feature) · este
> archivo (estado). El detalle rico de todo lo construido antes del arnés está en
> `../../memory.md` y `../HANDOFF.md`.

**Última actualización:** 2026-09-08
**Feature activa:** ninguna. C9 y C10 (Delivery, los tres canales) quedaron cerradas.
**Próxima:** C11 — identidad visual de CENFOR, cuando llegue el material del cliente.
**En producción:** https://dashboard-cenfor.vercel.app

---

## Dónde está todo parado

| Área | Estado |
|---|---|
| Reseñas de Google | funcionando, con datos reales |
| Mystery Shopper | funcionando · ahora también lista las visitas de delivery del formulario |
| Auditorías presenciales | funcionando (el dashboard es el archivo histórico que la planilla no tiene) |
| Delivery | **terminado**: Rappi, PedidosYa y Uber |
| Plan de acción | lugar reservado en el menú, sin definir con el cliente |

Datos cargados: 29 reseñas · 9 snapshots · 8 visitas de MS · 6 auditorías · 884 valores de
indicadores de delivery (julio y agosto 2026, tres canales) · 225 filas de motivos · 46 puntos
de venta sobre 10 locales.

---

## Delivery, cerrado para los tres canales

La sección Delivery muestra **lo que publican las apps**: Rappi, PedidosYa y Uber, un canal
por vez. Las visitas de delivery del mystery shopper se listan en «MS y Auditorías», junto a
las de take away y promediadas aparte: son otra fuente y otra cosa.

| Canal | Puntos de venta | Indicadores | Valores cargados |
|---|---|---|---|
| Rappi | 22 (1 cerrado) | 13 + motivos de reclamo | 517 |
| PedidosYa | 16 | 9 | 239 |
| Uber | 8 (3 sin ventas todavía) | 14 | 128 |

Julio y agosto de 2026 en los tres. Woops solo existe en PedidosYa: no vende por Rappi.

**Los indicadores son datos, no columnas.** Cada canal declara qué mide en
`delivery_metric_defs` —clave, nombre, unidad, si subir es bueno, si va en las tarjetas y el
encabezado exacto de su planilla— y los valores van a `delivery_metric_values`. De ahí salen
tres cosas: un solo parser lee las tres planillas, la pantalla dibuja los indicadores del
canal sin tener una lista en el código, y **sumar un indicador es una fila en una tabla**.

Decisiones que conviene no revertir sin motivo:

- **No hay vista de los tres canales juntos.** Solo la disponibilidad y la calificación
  existen en los tres, y ni siquiera igual: Rappi mide "Disponibilidad %", Uber "Tiempo en
  línea" y PedidosYa "Hora no disponible", que es el concepto invertido y en horas. Un
  promedio de las tres sería un número que no existe en ninguna app.
- **Cada canal declara en la pantalla cómo está hecha su cuenta.** La calificación de Rappi se
  pondera por reseñas y la de PedidosYa por evaluaciones; la de Uber va en promedio simple,
  porque Uber publica el Score pero no cuántas evaluaciones lo forman. Uber es el único que
  publica el volumen de pedidos, así que es el único cuyos porcentajes podrían ponderarse.
- **Los valores se normalizan al guardar, no al mostrar.** Un porcentaje siempre en 0–100, una
  duración siempre en minutos. La unidad la declara el catálogo, y se resolvió leyendo los
  valores FORMATEADOS de cada planilla: sin formato, `0:01:28` de Uber y `44,9%` de PedidosYa
  son la misma fracción, y las dos columnas se llaman "Tiempo de espera evitable".
- **Delivery usa el filtro de meses del tablero, pero sin «Todo».** Lo que publican las apps
  son cierres mensuales: «Todo» tendría que promediar agosto con julio, y el promedio de dos
  cierres no es un número que exista en ninguna app.
- **De cada mes se usa la carga con el cierre más reciente, nunca la suma.** Agosto de Rappi
  viene cargado dos veces —al 24 y al 31— y la segunda incluye a la primera (27 órdenes al 24,
  49 al 31). Está en `delMes()`, en `delivery.ts`.
- **Una fila sin período se saltea en silencio.** PedidosYa trae 176 filas de plantilla para
  los meses que todavía no llegaron. Contarlas como descarte llenaría de ruido el único aviso
  que importa: una tienda renombrada.
- **Ningún número está pintado de verde o rojo.** Los umbrales de mystery shopper y auditorías
  vienen de la planilla del cliente; los de delivery CENFOR no los definió. Un semáforo
  inventado se lee como criterio del cliente.
- **Alta Córdoba queda fuera de los promedios y se dice en pantalla.** Es un local cerrado con
  julio y agosto cargados: aparece con 0% de disponibilidad y hunde el número del grupo con
  una tienda que ya no existe. `getPuntosDeVenta()` los trae igual —activos e inactivos—
  porque filtrarlos en la consulta dejaba las filas de indicadores sin nombre en la pantalla.

**Verificado el 08/09/2026** con el build de producción y datos reales: los tres canales en
los dos meses; 489 filas leídas, 884 valores + 225 motivos, **cero descartadas**; dos corridas
seguidas del sync dejan los mismos conteos; `/api/sync` sin autorización sigue dando 401.

La migración de Rappi al modelo nuevo se comparó **antes** de borrar la tabla vieja: los siete
agregados de agosto —reclamos 4,8150 · cancelaciones 0,3905 · demora 32,0055 · disponibilidad
91,9240 · calificación 4,1200 · 175 reseñas · $226.330— dieron idénticos hasta el cuarto
decimal calculados con las columnas y con el catálogo.

---

## El filtro de fecha es uno solo, y es por mes

Las cinco pantallas usan el mismo control: **«Todo» y un mes calendario**. Reemplazó al de
Todo / 30 días / 90 días / Este año el 08/09/2026, a pedido de Daniela.

Por qué: «30 días» es un recorte que se mueve solo —el mismo link muestra otra cosa la semana
que viene, y una visita del 5 de agosto entra o sale según el día en que se mire—, y los datos
de delivery son cierres mensuales que no entraban en ese molde, así que esa sección tenía su
propio filtro y el tablero hablaba dos idiomas.

**Cada sección ofrece solo los meses que ella tiene cargados**, así nunca se elige un mes que
va a salir vacío: Reseñas agosto y septiembre, MS y Auditorías solo agosto, Delivery julio y
agosto. El menú arrastra el mes al cambiar de sección y, si esa sección no lo tiene, cae en
«Todo» en vez de mostrar una pantalla en blanco.

«Todo» sigue siendo el default: con 29 reseñas y 8 visitas repartidas en dos o tres meses,
abrir filtrado por uno daría una primera impresión de tablero medio vacío.

El componente es `FiltroMeses` y pasa a `select` cuando hay más de seis meses, que es cuando
una fila de botones deja de entrar. Verificado el 08/09/2026: 27 reseñas en agosto + 2 en
septiembre = las 29 de «Todo».

---

## Cómo retomar

1. `bash init.sh` → leer este archivo → `features.json`.
2. `npm run dev` levanta en **el puerto 3100** (el 3000 lo ocupa el dashboard de Papanato).

## Pendientes

**Esperando definición de Daniela / el cliente:**
- **¿Woops Nueva Córdoba operó en agosto?** En PedidosYa trae 100% de cancelación evitable con
  score «-», 0 evaluaciones y 0% de pedidos listos. Ella sola lleva el promedio de las 16
  tiendas de 0% a 6,3%. El número es el que publica la app y se muestra tal cual.
- **«Tiempo de espera evitable» no significa lo mismo en Uber que en PedidosYa** —una duración
  contra un porcentaje— aunque la columna se llame igual en las dos planillas.
- **Umbrales de delivery** — qué porcentaje de reclamos, cancelaciones, demora y disponibilidad
  es aceptable. Sin eso la pantalla muestra los números sin semáforo.
- placeId de Censurado Luuma · umbral de las auditorías · qué mails van en `emails_autorizados`.

**Tareas manuales:**
- Publicar la app en Google si se quiere abrir al equipo (hoy está en modo Prueba: solo entran
  los mails cargados como usuarios de prueba).
- Avisarle al cliente que las planillas tienen las fechas con el formato roto (usan `AAAA` para
  el año). El sync lo esquiva, pero si alguien exporta o imprime, salen sin año.

**A criterio de Daniela, no son errores:**
- El Resumen no tiene todavía ninguna tarjeta de delivery. Hoy resume reseñas, mystery shopper
  y auditorías.

## Seguridad — las tres claves se rotaron el 08/09/2026

| Clave | Antes | Ahora |
|---|---|---|
| Cuenta de servicio de Google | `3c8bf146`, impresa en una conversación el 04/09 | `e9081c5f`, la vieja **borrada** en Google Cloud |
| `SUPABASE_SERVICE_ROLE_KEY` | legacy JWT (`eyJ…`) | **`sb_secret_…`**; las legacy quedaron **desactivadas** |
| `CRON_SECRET` | el original | uno nuevo de 43 caracteres |

Las tres están en `.env.local` y en Vercel (Production). **No hay ninguna copia suelta en el
disco**: `_credenciales/` quedó vacía a propósito, con una nota adentro.

La clave pública del login (`sb_publishable_XFcBwY15c…4AzLwm`) **no se tocó**: no es un secreto,
viaja al navegador de cualquiera que abra el dashboard.

> **Por qué se rotó la de Supabase y el cron:** al rotar la de Google se subió por error al repo
> un respaldo del `.env.local` (`.env.local.backup-antes-de-rotar`). El `.gitignore` cubría
> `.env*.local` y ese nombre no matcheaba. El archivo se sacó y el `.gitignore` pasa a ignorar
> `.env*` entero, pero **el commit anterior sigue en la historia de GitHub**: por eso las claves
> que estaban ahí adentro se cambiaron todas. El repo es privado.

## Gotchas acumulados

- **Turbopack no anda en esta máquina; webpack sí.** `npm run dev` ya lleva `--webpack`. Si las
  pantallas dan 500 y `/api/sync` responde 200, esa es la firma: panic de Turbopack al compilar
  `globals.css` (`exit code: 0xc0000142`). Reiniciar no lo resuelve.
- **Next se planta si ya hay un dev server del proyecto corriendo**, aunque se le pase otro
  puerto («Another next dev server is already running»). Para ver una pantalla sin matar el
  server de Daniela: `npm run build` y `MODO_DEMO=1 npx next start -p 3101`.
- **Una consulta de Supabase que falla devuelve `data` en null y la pantalla se dibuja vacía sin
  decir nada.** Así apareció la primera versión de Delivery, con «21 de 0 puntos de venta» y la
  columna de nombres vacía. Las consultas nuevas loguean el `error` en el server.
- **Un secreto en un archivo que no matchea el .gitignore se sube igual.** El patrón `.env*.local` no cubría `.env.local.backup-antes-de-rotar`. Ahora se ignora `.env*` entero. Antes de un `git add -A`, mirar `git status`.
- **El conector de Google Drive de Claude solo ve los archivos que creó Daniela**, no los
  compartidos con ella. Las planillas se bajan por su URL pública de export. Para leer todas
  las pestañas hay que bajar el xlsx y abrirlo con exceljs.
- **La URL de producción es `dashboard-cenfor.vercel.app`**, no la que Vercel muestra al
  terminar el deploy: esa cambia en cada push y está detrás del SSO de Vercel.
- **El tope de 2 crons diarios de Vercel es por cuenta y se comparte con Papanato.** Por eso el
  sync es una sola ruta con las 4 fuentes adentro y no cinco crons.
- **Ningún local se identifica solo por su nombre:** "Nueva Córdoba" existe en las dos marcas.
  Y ningún punto de venta se identifica por su local: Urca tiene tres.
- Google Cloud no interviene al publicar: solo se actualizan Site URL y Redirect URLs de
  Supabase, porque el navegador va a Google con el `redirect_uri` de Supabase, no con el de
  la app.

## Verificaciones que se pueden correr

```bash
bash init.sh
npm run typecheck
npm run ensayo-sync   # corre el sync contra las planillas vivas, sin escribir en la base
```
