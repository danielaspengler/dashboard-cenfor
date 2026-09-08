# Estado actual — Dashboard CENFOR

> Esto es lo PRIMERO que se lee al retomar. Snapshot del ahora, no historia.
> Se reescribe al cerrar cada sesión. La historia comprimida va en `HISTORY.md`.
>
> **Fuente de verdad:** `features.json` (qué falta) · `specs/` (receta por feature) · este
> archivo (estado). El detalle rico de todo lo construido antes del arnés está en
> `../../memory.md` y `../HANDOFF.md`.

**Última actualización:** 2026-09-08
**Feature activa:** C9 — Delivery (Rappi). A mitad de camino.
**En producción:** https://dashboard-cenfor.vercel.app

---

## Dónde está todo parado

| Área | Estado |
|---|---|
| Reseñas de Google | funcionando, con datos reales |
| Mystery Shopper | funcionando |
| Auditorías presenciales | funcionando (el dashboard es el archivo histórico que la planilla no tiene) |
| Delivery | **a medio hacer** — ver abajo |
| Plan de acción | lugar reservado en el menú, sin definir con el cliente |

Datos cargados: 29 reseñas · 9 snapshots · 8 visitas de MS · 6 auditorías.
Verificado con datos reales el 04/09: Censurado 4,42★ / 832 reseñas · MS 83,9% · auditorías
77,0%. Formaggio 4,62★ / 301 · MS 78,4% · auditorías "no aplica".

---

## Lo que está a medio hacer: C9, Delivery de Rappi

**Hecho y probado:** las migraciones del esquema (`sub_brands`, `delivery_points`,
`delivery_metrics`, `delivery_issues`, con RLS), el seed de 3 marcas B + 21 puntos de venta, el
parser, **y la integración al sync**. Todo eso quedó commiteado el 08/09 (`a2f5c74`).

**Verificado en producción el 08/09/2026:** `/api/sync` responde 200 en 7 s con cinco fuentes,
y `delivery` trae 268 leídas / 268 guardadas, cero descartadas.

**Falta solo la pantalla.**

Tres cosas para tener presentes al retomar:

- **La unidad no es el local, es el punto de venta** (local + marca B + formato + canal):
  22 puntos sobre 10 locales.
- **Los períodos son mensuales**, no diarios.
- **En las pestañas de motivos hay dos cargas de agosto** (cerradas al 24 y al 31). Sumar
  motivos por mes cuenta agosto dos veces. En `Rappi_Publicado` no pasa: ahí hay un período
  por mes.

---

## Cómo retomar

1. `bash init.sh` → leer este archivo → `features.json`.
2. `npm run dev` levanta en **el puerto 3100** (el 3000 lo ocupa el dashboard de Papanato).

## Pendientes

**Esperando definición de Daniela:**
- **Dos puntos de venta de Rappi sin identificar:** "Censurado - Alta Córdoba" y
  "Censurado - Olga Orozco 3023". No son ninguno de los 10 locales, y Luuma no aparece en la
  planilla con ese nombre — alguno de los dos puede ser Luuma. Hoy el sync los descarta y los
  informa.
- placeId de Censurado Luuma · umbral de las auditorías · qué mails van en `emails_autorizados`.

**Tareas manuales:**
- Publicar la app en Google si se quiere abrir al equipo (hoy está en modo Prueba: solo entran
  los mails cargados como usuarios de prueba).
- Avisarle al cliente que las planillas tienen las fechas con el formato roto (usan `AAAA` para
  el año). El sync lo esquiva, pero si alguien exporta o imprime, salen sin año.

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

Verificado con todo lo viejo ya desactivado: `/api/sync` en producción 200, cinco fuentes, 320
filas; el login carga; el ensayo en seco da 29 · 9 · 8 · 6.

> **Por qué se rotó la de Supabase y el cron:** al rotar la de Google se subió por error al repo
> un respaldo del `.env.local` (`.env.local.backup-antes-de-rotar`). El `.gitignore` cubría
> `.env*.local` y ese nombre no matcheaba. El archivo se sacó y el `.gitignore` pasa a ignorar
> `.env*` entero, pero **el commit anterior sigue en la historia de GitHub**: por eso las claves
> que estaban ahí adentro se cambiaron todas. El repo es privado.

## Gotchas acumulados

- **Turbopack no anda en esta máquina; webpack sí.** `npm run dev` ya lleva `--webpack`. Si las
  pantallas dan 500 y `/api/sync` responde 200, esa es la firma: panic de Turbopack al compilar
  `globals.css` (`exit code: 0xc0000142`). Reiniciar no lo resuelve.
- **Un secreto en un archivo que no matchea el .gitignore se sube igual.** El patrón `.env*.local` no cubría `.env.local.backup-antes-de-rotar`. Ahora se ignora `.env*` entero. Antes de un `git add -A`, mirar `git status`.
- **El conector de Google Drive de Claude solo ve los archivos que creó Daniela**, no los
  compartidos con ella. Las planillas se bajan por su URL pública de export. Para leer todas
  las pestañas hay que bajar el xlsx y abrirlo con exceljs.
- **La URL de producción es `dashboard-cenfor.vercel.app`**, no la que Vercel muestra al
  terminar el deploy: esa cambia en cada push y está detrás del SSO de Vercel.
- **El tope de 2 crons diarios de Vercel es por cuenta y se comparte con Papanato.** Por eso el
  sync es una sola ruta con las 4 fuentes adentro y no cinco crons.
- **Ningún local se identifica solo por su nombre:** "Nueva Córdoba" existe en las dos marcas.
- Google Cloud no interviene al publicar: solo se actualizan Site URL y Redirect URLs de
  Supabase, porque el navegador va a Google con el `redirect_uri` de Supabase, no con el de
  la app.

## Verificaciones que se pueden correr

```bash
bash init.sh
npm run typecheck
npm run ensayo-sync   # corre el sync contra las planillas vivas, sin escribir en la base
```
