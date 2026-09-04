# Base de datos — Dashboard CENFOR

Proyecto Supabase: **`Calidad - Cenfor`** (`rnismttcxwrydcyxpygs`), organización de Den,
región us-east-1. URL: `https://rnismttcxwrydcyxpygs.supabase.co`

## Regla de trabajo

**Ningún cambio de esquema se hace a mano en el panel de Supabase.** Todo pasa por una
migración versionada acá. Si alguien agrega o renombra una columna desde el editor SQL, la
base y el código quedan desincronizados, el sync se rompe sin avisar y no queda registro de
qué cambió ni cuándo. Con migraciones, la base se recrea de cero corriéndolas en orden.

Esto importa más cuanta más gente tenga acceso de escritura. Hoy son dos: Daniela
(Administrator) y Den (Owner).

## `migrations/` — el esquema

| Archivo | Qué hace |
|---|---|
| `20260903120000_esquema_inicial_operaciones.sql` | Las 9 tablas del área Operaciones, con RLS y las funciones de permisos. |
| `20260903120100_cerrar_execute_helpers_a_anon.sql` | Cierra las funciones auxiliares, que Postgres deja llamables sin sesión por defecto. |
| `20260903120200_seed_marcas_areas_y_locales.sql` | Las 2 marcas, las áreas y los 10 locales con sus llaves de matcheo. |

## `bootstrap/` — la carga inicial de datos

No son migraciones de esquema: son los datos que había en las planillas al 04/09/2026,
cargados una vez para poder construir las pantallas contra datos reales. De acá en adelante
los mantienen los syncs.

Los dos archivos son idempotentes (`on conflict do nothing`): correrlos otra vez no
duplica nada. Se generan con `scripts/generar-sql.ts` a partir de las planillas vivas.

## Modelo de datos

Lo que distingue este esquema del maestro de Papanato:

**`brands` por encima de `locations`.** CENFOR son dos marcas (Censurado, 7 locales, y
Formaggio, 3). Papanato es una sola marca y no tiene ese nivel. Consecuencia: "Nueva
Córdoba" existe en las dos marcas, así que ningún local se identifica solo por su nombre.

**Las llaves de matcheo viven en `locations`, no en el código.** Cada local guarda su
`google_place_id`, su `ms_form_label` (cómo lo escribe el formulario de mystery shopper) y
su `audit_sheet_label` (el campo LOCAL de la pestaña de auditoría). Sumar un local es
cargar una fila, no tocar un sync.

**`review_snapshots`.** La hoja `Rating_Snapshot` de la planilla se pisa a sí misma en cada
scrapeo: solo muestra el acumulado de hoy. Guardando una fila por corrida, el dashboard
puede mostrar cómo evolucionó el promedio de cada local — información que hoy se pierde
todas las semanas.

**`audits` con dedup por local + fecha.** La planilla de auditorías es una plantilla con una
pestaña por local que guarda una sola auditoría, la última. No tiene historial. Guardando
cada corrida acá, el dashboard se convierte en el archivo histórico que la fuente no tiene,
aunque el cliente pise la pestaña.

**`mystery_shopper_visits.needs_review`.** La planilla marca "⚠ Revisar Config" cuando su
motor no encontró una respuesta en la tabla de puntajes: ese puntaje está mal calculado. La
visita se guarda igual —para que se vea que existió— pero queda excluida de los promedios.

## Permisos — una lista de mails y nada más

Decidido el 04/09/2026: sin roles, sin permisos por área ni por marca. Una tabla,
`emails_autorizados`. **Quien está en la lista ve todo. Quien no está, no entra ni ve nada.**

Se administra desde el panel de Supabase (Table Editor → `emails_autorizados`): agregar una
fila habilita a esa persona, borrarla la deja afuera de inmediato, aunque ya tenga la cuenta
creada.

El control está en dos capas, y las dos importan:

1. **No puede crear la cuenta.** Un trigger sobre `auth.users` rechaza el alta si el mail no
   está en la lista. La persona recibe un error al pedir el link de acceso.
2. **No puede leer ningún dato.** Todas las policies de RLS preguntan por la misma lista. Si
   mañana aparece un usuario creado por otra vía —una importación, un cambio de configuración
   de Supabase, lo que sea— sigue sin poder leer una sola fila.

La primera capa sola no alcanzaría: es comodidad, para que el rechazo se vea en el momento.
La segunda es el candado.

Nadie escribe desde el cliente: la escritura la hacen únicamente los syncs con `service_role`,
que saltea RLS por diseño. Por eso no existen policies de insert, update ni delete.
