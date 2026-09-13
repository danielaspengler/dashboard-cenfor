# Design — C16 · Corte metodológico en auditorías presenciales

> Criterios en `requirements.md`. Relevamiento y origen del problema en `SPEC.md`.

## Enfoque

Tres piezas chicas y todo lo demás es consumirlas:

1. **Una constante y una función de escala** en `marca.ts`, al lado de los umbrales que ya viven
   ahí. La fecha del corte y los umbrales son criterios del cliente, como `NIVELES_AUDITORIA` y
   `PESOS_SCORE`.
2. **Un módulo nuevo, `src/lib/auditorias.ts`**, con el promedio que **no puede** devolver un
   número único cuando el conjunto cruza el corte. No es una convención que haya que recordar: el
   tipo de retorno obliga a quien lo usa a manejar el caso mixto.
3. **Una prop opcional `corte` en `GraficoLinea`**, el componente que ya existe desde C15. No se
   escribe un gráfico nuevo.

Lo demás son textos y llamadas. Sin migraciones, sin cambios en el sync ni en `audits`: el dato ya
está guardado y es válido con su escala.

## Archivos que se tocan

| Archivo | Qué cambia |
|---|---|
| `src/lib/marca.ts` | `CORTE_AUDITORIAS`, `escalaAuditoria()`, `NIVELES_AUDITORIA_NUEVA` (hoy `null`) y `nivelAuditoria()` que pasa a recibir la fecha. `NIVELES_AUDITORIA` no se toca. |
| `src/lib/auditorias.ts` (nuevo) | `promedioAuditorias()` y `serieAuditorias()`. Sin imports fuera de `marca.ts`. |
| `src/components/ui.tsx` | `Puntaje` recibe `fecha` y separa «no hay valor» de «no hay semáforo». |
| `src/components/graficos.tsx` | Prop opcional `corte` en `GraficoLinea`. `GraficoBarras` no se toca. |
| `src/app/(panel)/operaciones/ms-auditorias/page.tsx` | Bajada, detalle de la tarjeta, aviso en la sección de auditorías, sección nueva de evolución. |
| `src/app/(panel)/operaciones/resumen/page.tsx` | El promedio de auditorías inline pasa a `promedioAuditorias()`; la tarjeta muestra los dos tramos cuando hay mixtura. |
| `src/app/(panel)/operaciones/informe/page.tsx` | Aviso del corte en el bloque «Resumen de auditoría». |
| `src/lib/score.ts` | El `detalle` del eje Auditoría dice con qué planilla se midió. El cálculo no cambia. |
| `scripts/probar-auditorias.ts` (nuevo) | Prueba con filas fijas, mismo patrón que `probar-score.ts` y `probar-economico.ts`. |

**No se tocan:** `src/lib/data.ts`, `src/lib/sync/*`, `src/lib/filtros.ts`, el esquema,
`globals.css`, ni la pantalla de Delivery, Reseñas o Resumen administrativo.

## La constante y la escala (`marca.ts`)

```
CORTE_AUDITORIAS = "2026-08-01"   // desde acá rige la planilla exigente
escalaAuditoria(fecha) → "anterior" | "nueva" | "desconocida"
```

- Comparación de strings ISO (`fecha >= CORTE_AUDITORIAS`), como ya hace todo el proyecto con las
  fechas. Sin `Date`, sin husos horarios.
- Una fecha vacía o ilegible devuelve `"desconocida"` (CA-4). No se la asigna a un lado: una
  auditoría de escala desconocida no puede entrar a un promedio que dice con qué vara se midió.
- `MES_CORTE` derivado (`CORTE_AUDITORIAS.slice(0, 7)`) para el gráfico y para escribir «agosto
  2026» en los textos con `etiquetaMes()`. Así el mes de los avisos también sale de la constante
  (CA-13) y no hay un segundo lugar que actualizar.

**Por qué en `marca.ts` y no en un `calidad.ts` nuevo** (`SPEC.md` proponía lo segundo): los
criterios del cliente sobre auditorías ya viven ahí —los cinco cortes de `NIVELES_AUDITORIA`, los
pesos del score—, con el comentario que explica que son de la planilla y no una elección de diseño.
El corte es del mismo tipo de dato. Partirlo en dos archivos obligaría a mirar en dos lugares
cuando el cliente cambie de criterio, que es justo lo que esta feature intenta evitar. Es además la
regla de marca blanca de `CALIDAD.md`: cliente nuevo = otra config, no una cacería de constantes.

## El promedio que no puede cruzar (`auditorias.ts`)

```
Escala = "anterior" | "nueva" | "desconocida"
Tramo  = { valor: number | null; visitas: number }

PromedioAuditorias =
  | { tipo: "unico"; escala: "anterior" | "nueva"; valor: number; visitas: number }
  | { tipo: "mixto"; anterior: Tramo; nueva: Tramo }
  | { tipo: "sin_dato" }

promedioAuditorias(auditorias) → PromedioAuditorias
```

- Entra una lista de `{ audit_date, score_pct }` y nada más: el tipo es estructural, así que sirve
  para `AuditoriaFila` sin importar `data.ts` (que arrastra `next/headers` y no carga fuera de
  Next). Es la mitigación que C15 tuvo que improvisar, aplicada desde el principio.
- Las filas sin `score_pct` y las de escala desconocida no entran a ningún tramo (CA-4).
- `tipo: "mixto"` **no tiene campo `valor`**. Esa es la garantía: una pantalla que quiera imprimir
  un número único sobre un conjunto que cruza el corte no compila. La regla no depende de que
  alguien se acuerde de chequear.

```
serieAuditorias(auditorias) → { meses: string[]; valores: (number | null)[] }
```

Un valor por mes con auditorías, del más viejo al más nuevo, promediando **dentro** del mes —que
nunca cruza el corte, porque el corte cae en un límite de mes—. Los meses sin auditorías entre dos
con auditorías quedan como `null`, que `GraficoLinea` ya dibuja como hueco y no como cero.

## Umbrales (P1) — el cambio de una línea

```
NIVELES_AUDITORIA        // los cinco cortes de la planilla anterior. No se tocan.
NIVELES_AUDITORIA_NUEVA: readonly Nivel[] | null = null   // a confirmar con el cliente
```

`nivelAuditoria(pct, fecha)` elige la lista según la escala de la fecha. Con
`NIVELES_AUDITORIA_NUEVA` en `null`, una auditoría de la escala nueva **no tiene nivel**: se
muestra el número sin color y sin clasificación (la opción provisoria de `requirements.md` → P1).

Cuando el cliente conteste, el cambio es darle valor a esa constante. Una línea, en el mismo
archivo, y se propaga a la tabla de MS y Auditorías, al Resumen y al informe sin tocarlos. Si la
respuesta es «los cortes son los mismos», la línea es
`NIVELES_AUDITORIA_NUEVA = NIVELES_AUDITORIA`.

**`Puntaje` tiene que separar dos cosas que hoy son la misma.** Hoy hace
`if (pct === null || !nivel) return <SinDato>—</SinDato>`: sin nivel, no muestra el número. Pasa a
mostrar el número siempre que exista, y a pintarlo solo si hay nivel. Sin ese cambio, la opción
provisoria escondería puntajes que el cliente sí midió.

En el informe, `nivelAuditoria(...)?.nombre` queda vacío para la escala nueva: el bloque muestra el
puntaje sin la clasificación al lado, en vez de un hueco. Las barras por dimensión caen en el color
de marca, que ya es su fallback actual.

## La marca del corte en el gráfico (`graficos.tsx`)

Prop opcional en `GraficoLinea`, sin `"use client"` ni estado, como todo el archivo:

```
corte?: { mes: string; antes: string; desde: string }
```

- **Dónde cae la línea:** en el borde izquierdo de la columna del mes del corte
  (`izq + anchoColumna × i`), no sobre el punto. El corte pasó entre dos meses, no dentro de uno.
- **Se dibuja solo si `i > 0` y `i < meses.length`** (CA-20): con meses de un solo lado no hay
  frontera que marcar.
- **Línea vertical punteada** (`stroke-dasharray`, `--color-borde`), de arriba abajo del área útil.
- **El tramo nuevo, punteado.** La línea se parte en dos `path`: el tramo anterior sólido y el
  tramo desde el corte punteado, reusando `tramos()` con los valores de afuera del rango puestos en
  `null`. El segmento que une los dos tramos va punteado, como en la referencia: es el que cruza.
- **Dos etiquetas** en la franja de arriba, `fontSize` 9: `antes` anclada a la derecha de la línea
  (`text-anchor="end"`) y `desde` a la izquierda (`text-anchor="start"`). Textos: «medido con la
  planilla anterior» y «planilla nueva, más exigente». Los pasa la pantalla, no el componente: el
  gráfico no sabe de auditorías.
- **Sin sombra sobre el tramo nuevo**, a diferencia de `graficos.js`. `--color-nube` ya es la
  franja del mes elegido en este componente, y dos fondos grises distintos en el mismo gráfico se
  leen como la misma señal. El tramo nuevo se distingue por la línea punteada, que es la
  diferencia que importa.
- **Sin colores escritos a mano** (CA-22): la referencia usa el amarillo de la presentación de
  Cámara; acá van las variables de `globals.css`, como el resto del archivo.

Referencia visual: `HOLT/CENFOR/Presentacion-Camara/graficos.js`, función `calidad()` (líneas
104–115).

## Las pantallas

### MS y Auditorías (`ms-auditorias/page.tsx`)

1. **Bajada** (CA-13). Reemplaza a la actual:
   «Puntajes calculados por las planillas del cliente · mystery shopper ≥90 excelente, ≥75 bueno,
   ≥60 regular. Desde {mes del corte} la planilla de auditoría puntúa más exigente: los puntajes
   anteriores no se comparan con los nuevos.»
2. **Tarjeta «Auditorías»**: sigue mostrando la **cantidad**, que es lo que muestra hoy. Cuando el
   conjunto visible tiene auditorías de los dos lados, el detalle declara el reparto: «4 con la
   planilla nueva · 12 con la anterior». Cuando son todas del mismo lado, el detalle dice cuál.
3. **Bajada de la sección «Auditorías presenciales»** (CA-14), después de lo que ya dice sobre el
   histórico: «Desde {mes del corte} rige una planilla más exigente. Las auditorías anteriores y
   las nuevas no se comparan entre sí.» Y, mientras P1 esté abierta, la línea de los cortes de
   color se ajusta: «Los cortes de color son los de la planilla anterior. Para la planilla nueva
   están a confirmar con el cliente.»
4. **Columna «Planilla»** en la tabla de auditorías, entre Auditor y Puntaje: «anterior» o «nueva».
   Es el dato que explica por qué dos filas de la misma tabla no se comparan, y es una palabra por
   fila. El `Puntaje` de cada fila recibe la fecha de la auditoría.
5. **Sección nueva «Evolución del puntaje de auditoría»** (CA-17 a CA-21), al final:
   `GraficoLinea` con `serieAuditorias(todasLasAuditorias)` —**todas**, sin el filtro de mes
   (CA-18)—, `marcado` = el mes del filtro, `corte` con el mes de la constante y las dos etiquetas.
   Debajo, una línea: «Promedios mensuales de todas las auditorías cargadas. El filtro de fecha no
   recorta esta serie.» Con menos de dos meses, `GraficoLinea` ya devuelve «sin dato» por sí solo
   cuando no hay valores; para el caso de un solo mes la sección chequea el largo y muestra
   `SinDato` (CA-21).

### Resumen de Operaciones (`resumen/page.tsx`)

- El promedio inline (`auditoriaPromedio`, líneas 91–94) pasa a `promedioAuditorias(auditoriasMarca)`.
  **Este es el único lugar del tablero donde hoy un promedio cruza el corte**, porque el filtro por
  defecto es «Todo».
- La tarjeta «Auditorías» de cada marca:
  - `unico` → el puntaje como hoy, con el detalle «N realizadas · planilla nueva».
  - `mixto` → dos valores apilados, el nuevo arriba: «76,9%» y debajo, en chico, «89,4% con la
    planilla anterior». Detalle: «6 con la planilla nueva · 110 con la anterior. Promedios
    separados.»
  - `sin_dato` → lo de hoy: «sin auditorías» o «no aplica» según `audit_sheet_label`.
- La columna «Última auditoría» de la tabla muestra una sola auditoría y no cruza. Su `Puntaje`
  recibe la fecha, así respeta P1.
- La línea de pie de la tabla suma, cuando hay auditorías de los dos lados: «Las auditorías desde
  {mes del corte} se midieron con una planilla más exigente.»

### Informe por local (`informe/page.tsx`)

En la bajada del bloque «Resumen de auditoría», cuando la auditoría del mes es de la escala nueva
(CA-15): «Medida con la planilla vigente desde {mes del corte}, más exigente que la anterior. No se
compara con informes anteriores a {mes del corte}.» Mientras P1 esté abierta, la enumeración de los
cinco cortes de color se reemplaza por «los cortes de color de la planilla nueva están a confirmar
con el cliente»; para una auditoría de la escala anterior, el texto de hoy no cambia.

### Score de calidad (`score.ts`)

**El cálculo no se toca** (CA-10). Lo único que cambia es el `detalle` del eje Auditoría, que pasa
a decir con qué planilla se midió: «auditoría del 27/08 · planilla nueva». El informe ya imprime
ese detalle cuando el eje no tiene dato, y la línea del eje lo muestra al lado del nombre.

**Qué pasa cuando el mes comparado y el histórico caen a distinto lado** (la pregunta de la
consigna): hoy el score no compara meses —se calcula uno por vez y el informe no muestra variación
de score—, así que el problema no se materializa. El criterio queda escrito en CA-12 y en este
archivo: una comparación de scores entre meses de distinto lado del corte tiene que declarar que el
eje Auditoría no es comparable, o no mostrarse. Es la línea que un cambio futuro no puede cruzar.

## Decisiones de diseño

- **El tipo de retorno impide el error, no una convención.** `{ tipo: "mixto" }` sin campo `valor`
  hace que «promediar a través del corte» no compile. Un comentario que dice «ojo, no promediar
  acá» dura hasta la próxima pantalla que alguien escriba apurado.
- **La constante vive con los otros criterios del cliente.** Ver arriba: un solo lugar para mirar
  cuando el cliente cambie de vara.
- **El mes de los avisos sale de la constante.** Si el corte se moviera a septiembre, los cinco
  textos de pantalla dicen «septiembre 2026» sin que nadie los busque. Es la diferencia entre una
  constante y un literal repetido con otro disfraz.
- **La escala se decide por fecha, no por una columna nueva en `audits`.** Una columna obligaría a
  migración, a cambiar el sync y a rellenar las filas existentes, y el dato sería el mismo que la
  fecha ya dice. Si aparece un período de transición (P3), esta decisión se revisa: ahí la fecha
  deja de alcanzar.
- **El semáforo de la escala nueva queda apagado mientras P1 esté abierta.** Mismo criterio que
  Delivery, que muestra los números sin colores porque CENFOR no definió umbrales. Un semáforo
  inventado se lee como criterio del cliente.
- **La serie temporal no se recorta con el filtro de mes.** Una serie de un solo mes no es una
  serie. El filtro marca el mes elegido, que es lo que `GraficoLinea` ya sabe hacer.
- **Una prop opcional en `GraficoLinea`, no un componente nuevo.** El Resumen administrativo no
  pasa `corte` y se dibuja exactamente igual que hoy.
- **Una columna «Planilla» en la tabla, no un ícono ni un color.** Es la explicación de por qué dos
  filas no se comparan; una palabra se lee sin leyenda.

## Caminos descartados

- **Convertir los puntajes viejos a la escala nueva** (o al revés) con un factor. No hay
  equivalencia publicada por el cliente: sería un número inventado presentado como medición.
  Prohibido explícitamente en `SPEC.md`.
- **Ocultar o borrar las auditorías anteriores al corte.** El valor del dashboard es ser el archivo
  histórico que la planilla no tiene.
- **Sacar el eje Auditoría del score en los meses de la escala nueva.** Redistribuiría 30 puntos de
  peso por una razón metodológica, no por falta de dato, y haría que los scores de agosto no se
  comparen con nada. La auditoría se midió: entra.
- **Poner el corte en una columna de `audits` o en una tabla de «vigencias de planilla».** Una
  migración, un cambio de sync y un backfill para expresar lo que la fecha ya dice. Si aparece el
  período de transición de P3, vuelve a la mesa.
- **Un `src/lib/calidad.ts` nuevo para la constante** (lo que proponía `SPEC.md`): partiría en dos
  los criterios del cliente.
- **Sombrear el tramo nuevo del gráfico**, como `graficos.js`: `--color-nube` ya significa «mes
  elegido» en este componente.
- **Convertir la tarjeta de conteo de MS y Auditorías en un promedio.** Nadie lo pidió y el
  problema no lo requiere: esa tarjeta hoy no promedia nada.
- **Marcar el corte también en la serie de mystery shopper.** Su planilla no cambió.
- **Bajar los umbrales «unos diez puntos» mientras el cliente contesta.** Es exactamente el
  semáforo inventado que `CALIDAD.md` prohíbe.

## Seguridad

- Solo lectura, con las funciones que ya existen y `clienteDeLectura()`. Sin escrituras, sin
  migraciones, sin cambios en la RLS de `audits`.
- El guard sigue en dos capas: `proxy.ts` (sesión) + `(panel)/layout.tsx` (`esta_autorizado`).
- No entra ningún parámetro nuevo por la URL. El `mes` se sigue validando con `leerMesFiltro()`:
  un valor desconocido cae en «Todo».
- La fecha de corte es una constante del código, no un dato editable: no se valida porque no entra
  de afuera. Queda en el historial de git, que es donde tiene que estar un cambio que mueve la
  lectura de todos los meses.

## Riesgos

- **Hoy no hay con qué verlo funcionar.** Con 6 auditorías, todas de agosto 2026, ninguna pantalla
  muestra el caso mixto y la serie tiene un solo mes. Mitigación: la verificación de los números va
  con filas fijas en `scripts/probar-auditorias.ts` (T1) y el revisor cruza las pantallas contra
  ese script, no contra la base. Es lo que abre P2.
- **Las dos etiquetas del gráfico se pisan si un tramo tiene pocos meses.** Con el histórico
  cargado son 19 meses contra 1: la etiqueta de la derecha no entra. Mitigación: cuando el tramo
  tiene un solo mes, esa etiqueta se omite y queda la línea punteada, que ya marca el corte.
- **`Puntaje` cambia de comportamiento para todos sus usos.** Hoy un `pct` con nivel siempre lo
  tiene; el cambio solo afecta al caso «hay valor, no hay nivel», que únicamente ocurre con la
  escala nueva y P1 abierta. Mitigación: T5 verifica que mystery shopper y las auditorías del tramo
  anterior se ven exactamente igual.
- **P3 sin responder invalida el enfoque por fecha.** Si hubo locales auditados con la planilla
  vieja ya entrado agosto, la fecha no alcanza y hace falta una marca por auditoría. Mitigación: se
  pregunta antes de implementar; si la respuesta es «hubo transición», vuelve al líder.
- **El cliente cambia de nuevo la planilla el año que viene.** El diseño soporta **un** corte. Dos
  cortes pedirían una lista de vigencias, y eso es una feature aparte. No se abstrae hoy por un
  problema que todavía no existe.
