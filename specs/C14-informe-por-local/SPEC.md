# C14 — Informe mensual por local, descargable

> Estado: **fase 1 hecha** (las dimensiones de la auditoría entran al sync y los umbrales
> reales están aplicados). La fórmula del score llegó el 09/09/2026 en
> `TABLA_SCORE_MARCAS.md`; quedan cinco puntos abiertos, listados abajo.
>
> Referencia: `../../../Censurado - Carlos_Paz.pdf`, el informe que Daniela arma a mano
> cada mes. Tres páginas, un local, un mes.

## Qué se construye

Un botón de descarga por local y por mes que entrega el mismo informe que hoy se arma a
mano. Decidido con Daniela el 09/09/2026: **réplica fiel del PDF**, no una versión libre.

## Qué lleva el informe, y de dónde sale cada cosa

| Bloque del PDF | Fuente | Estado |
|---|---|---|
| Score local (87,10) con sus cuatro pesos | fórmula nueva | **falta definir** |
| Puntuaciones: Google ★ y PedidosYa ★, promedio sobre 100 | `review_snapshots` + `delivery_metric_values` | listo |
| Puntaje de auditoría (85,81) | `audits.score_pct` | listo |
| Las 9 dimensiones de la auditoría | planilla, tabla de resultados | listo — 09/09/2026 |
| Recomendaciones de la auditora | **no está en ningún lado** | se carga a mano |
| Puntaje de mystery shopper + sus 4 secciones | `mystery_shopper_visits` | listo |
| Comentarios de la visita («lo mejor», «qué cambiaría») | formulario, hoja que el sync no lee | **relevar** |
| Métricas operativas de la marca principal, por app, con variación | `delivery_metric_values` | listo |
| Otras marcas del local (dark kitchens) con sus métricas | ídem, agrupando por local | listo — es el filtro por local del 09/09 |
| Planes de acción numerados | los escribe una persona | **desbloquea C12** |

## Lo que se relevó el 09/09/2026 en la planilla de auditorías

**Las 9 dimensiones SÍ están, con su peso.** No hay que recalcularlas: la planilla trae una
`TABLA DE RESULTADOS` con la dimensión (col. B), su peso (col. M), el % alcanzado (col. N) y
el resultado global (col. U). Los números coinciden con el PDF: Fachada 72,2 · Mostrador
90,9 · Atención 93,3 · Caja 78,6 · Cocina 77,5 · Stocks 89,7 · Calif. auditor 86,7.

**Esa tabla NO está siempre en la misma fila.** Arranca en B113 en cinco pestañas y en B83 en
«Check Luuma». Hay que **buscarla por su texto**, no por celda fija — la misma lección que los
encabezados de las otras planillas. El parser actual lee cinco celdas fijas (D3, O4, D5, D4,
Z6) y eso alcanzaba para el puntaje final; para las dimensiones no alcanza.

**Las recomendaciones de la auditora NO existen en la planilla.** El bloque «OBSERVACIONES A
CARGO DEL ANALISTA DE CALIDAD» está **vacío en las cinco pestañas revisadas**, y encima
cambia de fila (B126 en cuatro, B124 en Recta). El texto del PDF lo escribe Daniela. Van
cargadas a mano, como los planes de acción.

**Los umbrales de auditoría están en la planilla y nadie los había visto.** El bloque
«LECTURA DE LOS RESULTADOS» los define: 0–49,99 no se cumple · 50–69,99 mínimamente
aceptable · 70–89,99 aceptable, capacitar · 90–94,99 mantener y pulir · 95–100 felicitar.
**Esto cierra un pendiente que figuraba como «esperando definición del cliente».** Ojo: son
CINCO cortes y no coinciden con los cuatro de mystery shopper (90/75/60), así que las dos
secciones no comparten semáforo.

**El puntaje de Carlos Paz hoy es 86,04% y el PDF dice 85,81%.** La planilla se pisó con una
auditoría nueva desde que se armó ese informe. Es exactamente el motivo por el que el
dashboard guarda cada corrida: el informe de un mes tiene que salir del histórico de la base,
nunca de lo que la planilla muestra hoy.

## La fórmula del score, según `TABLA_SCORE_MARCAS.md` (09/09/2026)

**Censurado, cuatro ejes al 25%:** Auditoría (puntaje final directo) · Mystery shopper
(puntos obtenidos ÷ máximos × 100) · Puntuaciones (rating ÷ 5 × 100, sobre Rappi, PedidosYa
y Google) · Operativo (100 − cancelados% − rechazados% − tiempo cerrado%).

**Formaggio, dos ejes al 50%:** Mystery shopper y Puntuaciones (Google solo). Auditoría y
Operativo no le corresponden — falta **estructural**, la sección no aparece en su informe.

**Un eje sin dato no vale cero: se redistribuye su peso** entre los ejes que sí tienen dato
(`Σ(score×peso) / Σ(pesos presentes)`). Un eje que el modelo no contempla se omite sin
aviso; uno que este mes no se cargó se muestra como «sin dato», que son dos cosas distintas.

### Decidido el 09/09/2026

- **Pesos:** Censurado 30 auditoría · 30 mystery · 20 puntuaciones · 20 operativo. Formaggio
  50 mystery · 50 puntuaciones, escritos como pesos propios y no como redistribución.
- **«Rechazados» y «cancelados» son lo mismo**, así que la fórmula no resta dos veces:
  `operativo = 100 − cancelados − tiempo cerrado`. **Los reclamos quedan fuera del eje** —
  falta confirmarlo.
- **Tiempo cerrado sobre el mes calendario** (24 h × días del mes), no sobre el horario del
  local: no hay que cargar ni mantener el horario de los diez.
- **El score es del local, sin sus dark kitchens.** Las marcas B van en su propia sección.
- **Puntuaciones = Google + Rappi + PedidosYa**, sin Uber, como dice la tabla. Verificado:
  Poeta Lugones da 92,67, idéntico al ejemplo de la tabla.

### Lo que la tabla no cierra

1. **Los pesos no coinciden con el PDF.** El informe de Carlos Paz dice Auditoría 30 ·
   Mystery 30 · Puntuaciones 20 · Operativo 20; la tabla dice 25 cada uno. La tabla es
   posterior, pero hay que confirmarlo antes de publicar un número distinto al del papel.
2. **«Tiempo cerrado» no es un porcentaje en esta base.** PedidosYa lo publica en horas
   («2 h 47 min») y así se guarda, en minutos. Para restarlo hace falta el divisor: horas
   del mes calendario, u horas de operación del local.
3. **Qué indicador de cada app es «cancelados» y cuál «rechazados».** Las tres apps los
   nombran distinto. Se resuelve declarándolo en `delivery_metric_defs` —una columna de rol,
   como ya se hizo con `pondera_con`— y no con una lista en el código.
4. **Uber queda afuera de Puntuaciones** en la tabla (dice Rappi, PedidosYa y Google), aunque
   el dashboard tiene su calificación. Confirmar si es a propósito.
5. **El score es del local o del local con sus dark kitchens.** En el PDF las marcas B van en
   una hoja aparte, así que parece ser solo la tienda Censurado del local.

## Cómo se genera el PDF

Página imprimible en el dashboard (`/operaciones/informe?local=…&mes=…`) con hoja de estilos
de impresión, y el botón llama al diálogo de impresión del navegador. **No** un renderizador
en el servidor: en el plan Hobby de Vercel una función con Chromium adentro no entra, y un
servicio externo mete otra cuenta y otro secreto para un PDF de tres páginas. El costo es que
el informe sale con el diálogo del navegador en el medio.

## Fases

1. ~~**Sync de auditorías ampliado**~~ — hecho el 09/09/2026: las 9 dimensiones van a
   `audits.categories` y los umbrales de la planilla a `marca.ts`. Verificado contra la
   planilla viva: la suma ponderada reproduce el puntaje final en los seis locales.
2. **Relevar el formulario de mystery shopper** — ver si los comentarios de la visita están en
   alguna hoja legible; si están, sumarlos al sync.
3. **Plan de acción cargable** (C12) — quién carga, cómo se cierra, y una tabla nueva.
   Es la única fase que necesita definición del cliente además de la del score.
4. **La página del informe** con todo lo anterior + el botón de descarga.
