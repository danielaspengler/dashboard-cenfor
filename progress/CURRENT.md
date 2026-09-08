# Estado actual — Dashboard CENFOR

> Esto es lo PRIMERO que se lee al retomar. Snapshot del ahora, no historia.
> Se reescribe al cerrar cada sesión. La historia comprimida va en `HISTORY.md`.
>
> **Fuente de verdad:** `features.json` (qué falta) · `specs/` (receta por feature) · este
> archivo (estado). El detalle rico de todo lo construido antes del arnés está en
> `../../memory.md` y `../HANDOFF.md`.

**Última actualización:** 2026-09-08
**Feature activa:** ninguna. C9 (Delivery — Rappi) quedó cerrada.
**Próxima:** C10 — PedidosYa y Uber, o C11 — identidad visual, según qué llegue antes del cliente.
**En producción:** https://dashboard-cenfor.vercel.app

---

## Dónde está todo parado

| Área | Estado |
|---|---|
| Reseñas de Google | funcionando, con datos reales |
| Mystery Shopper | funcionando · ahora también lista las visitas de delivery del formulario |
| Auditorías presenciales | funcionando (el dashboard es el archivo histórico que la planilla no tiene) |
| Delivery | **terminado para Rappi** · PedidosYa y Uber pendientes (C10) |
| Plan de acción | lugar reservado en el menú, sin definir con el cliente |

Datos cargados: 29 reseñas · 9 snapshots · 8 visitas de MS · 6 auditorías · 43 filas de
indicadores de Rappi (julio y agosto 2026) · 225 filas de motivos · 21 puntos de venta activos.

---

## C9 cerrada: la pantalla de Delivery

La sección Delivery muestra **los indicadores que publica Rappi**, nada más. Las visitas de
delivery del mystery shopper se listan en «MS y Auditorías», junto a las de take away y
promediadas aparte: son otra fuente y otra cosa.

Cinco decisiones que conviene no revertir sin motivo:

- **Selector de mes propio, no el filtro de período del tablero.** El dato de las apps es un
  cierre mensual. Con «30 días» julio desaparecería entero y agosto quedaría a medias sin que
  se note. Vive igual en la URL (`?mes=2026-07`), así que la pantalla sigue siendo componente
  de servidor.
- **De cada mes se usa la carga con el cierre más reciente, nunca la suma.** Agosto viene
  cargado dos veces —al 24 y al 31— y la segunda incluye a la primera (verificado: 27 órdenes
  al 24, 49 al 31). Sumarlas contaría el mes casi dos veces. Está en `delMes()`, en `data.ts`.
- **La calificación va ponderada por cantidad de reseñas; los porcentajes, en promedio simple,
  y la pantalla lo dice.** La planilla de Rappi no trae el total de órdenes de cada punto, así
  que no hay con qué ponderarlos. Derivarlo dividiendo las órdenes con reclamo por su
  porcentaje da cualquier cosa cuando el porcentaje es cero: antes de inventar un denominador,
  se declara cómo está hecha la cuenta.
- **Ningún número está pintado de verde o rojo.** Los umbrales de mystery shopper y auditorías
  vienen de la planilla del cliente; los de delivery CENFOR no los definió. Un semáforo
  inventado se lee como criterio del cliente.
- **Alta Córdoba queda fuera de los promedios y se dice en pantalla.** Es un local cerrado con
  julio y agosto cargados: aparece con 0% de disponibilidad y hunde el número del grupo con
  una tienda que ya no existe. `getPuntosDeVenta()` los trae igual —activos e inactivos—
  porque filtrarlos en la consulta dejaba las filas de indicadores sin nombre en la pantalla.

**Verificado el 08/09/2026** con el build de producción y datos reales: agosto da 4,12★ sobre
175 reseñas · 4,8% de reclamos (49 órdenes) · 0,4% de cancelaciones · 30,5% de demora · 87,5%
de disponibilidad · $226.330 compensados, con las variaciones contra julio. Julio abre sin
comparación, como corresponde. Los dos meses renderizan las 20 y 21 filas de puntos de venta y
los motivos agrupados.

---

## Cómo retomar

1. `bash init.sh` → leer este archivo → `features.json`.
2. `npm run dev` levanta en **el puerto 3100** (el 3000 lo ocupa el dashboard de Papanato).

## Pendientes

**Esperando definición de Daniela / el cliente:**
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
