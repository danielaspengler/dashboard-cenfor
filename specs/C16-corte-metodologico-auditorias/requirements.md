# Requirements — C16 · Corte metodológico en auditorías presenciales

> El relevamiento y el origen del problema están en `SPEC.md` (misma carpeta), con el OK de
> Daniela del 13/09/2026. Este archivo no lo repite: lo convierte en criterios verificables.

## Problema / objetivo

El cliente cambió en agosto de 2026 la puntuación de sus planillas de auditoría para ser más
exigente. El mystery shopper no se tocó. Los puntajes de antes y después miden con varas
distintas: ene 2025 – jul 2026 promedian 89,4% en 110 visitas y agosto 2026 da 76,9% en 6.

El tablero no sabe nada de esto. Cualquier promedio que cruce agosto 2026 mezcla dos escalas, y
la serie temporal muestra una caída de diez puntos que no ocurrió.

El objetivo es que **ningún número de auditoría del tablero cruce el corte sin declararlo**, sin
recalcular ni borrar nada de lo viejo.

## Lo que dice el código y la base (relevado el 13/09/2026)

Cinco hallazgos que cambian el alcance respecto de lo que dice `SPEC.md`:

| Hallazgo | Consecuencia |
|---|---|
| **La base tiene 6 auditorías y todas son de agosto 2026** (`features.json`, `CURRENT.md`: «6 auditorías», «MS y Auditorías solo agosto»). Las 110 visitas del tramo anterior están en la planilla del Looker, **no** en `audits`. | Hoy ningún promedio del tablero cruza el corte: la feature es **preventiva**. No se puede verificar contra la base viva. La verificación va con filas fijas en un script (CA-24) y la pregunta P2 define si el histórico se carga. |
| **Las auditorías se promedian en dos lugares distintos y ninguno es `promedioValido()`**: `resumen/page.tsx` lo hace inline (`auditoriaPromedio`, línea 91) y `score.ts` toma una sola auditoría del mes (línea 206). `promedioValido()` es solo de visitas de mystery shopper. | El «revisar todos los usos de `promedioValido()`» de `SPEC.md` apuntaba al lugar equivocado. Los usos reales están listados en CA-5 a CA-9. |
| **El score de calidad es de UN mes**: el eje Auditoría toma la auditoría más reciente de ese mes. No promedia a través del tiempo. | El score nunca cruza el corte por dentro. Lo que sí cruza es **comparar el score de dos meses** de distinto lado (CA-10, CA-11). |
| **`NIVELES_AUDITORIA` ya vive en `marca.ts`** (cinco cortes: 95 · 90 · 70 · 50), junto a `PESOS_SCORE` y `NIVELES`. Es la config central de criterios del cliente. | La constante de corte y los umbrales nuevos van al mismo archivo, no a uno nuevo (ver `design.md`). |
| **Hoy no existe ninguna serie temporal de auditorías en el tablero.** `graficos.tsx` se construyó para C15 y lo usa solo `/administracion/resumen`. | El gráfico del punto 5 de `SPEC.md` es una sección **nueva** en MS y Auditorías, no la corrección de una existente. |

## Criterios de aceptación (estilo EARS)

### La fecha de corte

- **CA-1** — El sistema debe tener **una sola** constante con la fecha de corte, exportada desde
  un único módulo. Ningún otro archivo puede contener el literal `2026-08` ni `2026-08-01` para
  este fin.
- **CA-2** — Cuando el corte cambie de fecha, el cambio debe ser **una línea** en esa constante,
  sin tocar pantallas, gráficos ni el score.
- **CA-3** — El sistema debe exponer una función que, dada la fecha de una auditoría, devuelva a
  qué escala pertenece: `anterior` (antes del corte) o `nueva` (desde el corte, inclusive).
- **CA-4** — Una auditoría **sin fecha legible** debe tratarse como escala desconocida y quedar
  fuera de los dos promedios, no asignarse a una escala por defecto.

### Ningún promedio cruza el corte en silencio

- **CA-5** — Cuando un conjunto de auditorías tiene visitas de los dos lados del corte, el sistema
  **no debe** devolver un promedio único: devuelve el promedio de cada tramo, con su cantidad de
  visitas y la marca de que el conjunto es mixto.
- **CA-6** — Cuando todas las auditorías del conjunto son del mismo lado, el sistema debe devolver
  un promedio único, con la escala a la que pertenece.
- **CA-7** — En **MS y Auditorías**, la tarjeta de auditorías sigue mostrando la **cantidad** de
  auditorías, que es lo que muestra hoy: esa pantalla no promedia auditorías y C16 no agrega un
  promedio nuevo. Cuando el conjunto visible tiene auditorías de los dos lados del corte, el
  detalle de la tarjeta debe declarar el reparto («4 con la planilla nueva · 12 con la anterior»);
  cuando son todas del mismo lado, debe decir cuál.
- **CA-8** — En el **Resumen de Operaciones**, la tarjeta «Auditorías» de cada marca debe cumplir
  lo mismo que CA-7. Con el filtro en un mes, el promedio es de un solo lado y se muestra como un
  número, diciendo con qué planilla se midió.
- **CA-9** — En la **tabla Detalle por local** del Resumen, la columna «Última auditoría» muestra
  una sola auditoría, así que no cruza. Cuando esa auditoría es de la escala nueva, la celda debe
  decirlo (CA-15).

### El score de calidad

- **CA-10** — El sistema **no debe** cambiar el cálculo del score: el eje Auditoría sigue pesando
  30 en Censurado y sigue tomando el puntaje tal como lo guardó el sync. No se recalcula, no se
  ajusta y **no** se lo saca del modelo en los meses de la escala nueva (sacarlo redistribuiría 30
  puntos de peso por una razón metodológica, no por falta de dato).
- **CA-11** — Cuando el mes de un score usa la escala nueva, el detalle del eje Auditoría debe
  decirlo (texto de CA-15), para que el informe lo muestre sin que la pantalla lo arme.
- **CA-12** — Cuando el sistema compare el score de dos meses que caen a distinto lado del corte,
  debe declarar que el eje Auditoría no es comparable, o no mostrar la comparación. Hoy el tablero
  no compara scores entre meses: el criterio queda escrito y se cumple por no existir. Si un cambio
  futuro agrega esa comparación sin declararlo, incumple este criterio.

### El aviso en pantalla

- **CA-13** — La bajada de **MS y Auditorías** debe decir que desde agosto 2026 la planilla de
  auditoría puntúa más exigente y que los puntajes anteriores no se comparan con los nuevos. El
  mes del texto sale de la constante (CA-1), no escrito a mano.
- **CA-14** — La sección «Auditorías presenciales» de esa pantalla debe llevar el aviso del corte
  en su bajada, junto a la explicación de los cortes de color.
- **CA-15** — El **informe por local** debe avisar del corte en el bloque «Resumen de auditoría»
  cuando el mes del informe usa la escala nueva, y decir que no se compara con informes anteriores
  a agosto 2026.
- **CA-16** — Los textos deben usar frases cortas y afirmativas con el dato adelante, decir «sin
  dato» donde falta algo y no llevar más de una raya (—) visible por pantalla. Nada de «no es X,
  es Y».

### La marca del corte en la serie temporal

- **CA-17** — **MS y Auditorías** debe mostrar una sección nueva con la evolución mensual del
  puntaje de auditoría, usando los componentes de `graficos.tsx` que se construyeron para C15. No
  se escribe un componente de gráfico nuevo.
- **CA-18** — La serie debe mostrar **todos** los meses con auditorías, sin recortarse con el
  filtro de mes de la pantalla. El mes elegido en el filtro queda marcado.
- **CA-19** — La serie debe marcar el corte con: línea vertical punteada en agosto 2026, el tramo
  desde el corte diferenciado del anterior, y dos etiquetas: «medido con la planilla anterior» y
  «planilla nueva, más exigente».
- **CA-20** — La marca del corte debe dibujarse solo cuando la serie tiene meses de los dos lados.
  Con meses de un solo lado no se dibuja ni la línea ni las etiquetas.
- **CA-21** — Cuando la serie tiene un solo mes con datos (el caso de hoy), la sección debe decir
  «sin dato» en vez de dibujar un punto suelto con ejes.
- **CA-22** — El gráfico no debe usar colores escritos a mano: solo variables de `globals.css`,
  como el resto de `graficos.tsx`.

### Lo que no se toca

- **CA-23** — El sistema **no debe** recalcular, corregir ni convertir ningún puntaje de auditoría
  guardado, ni borrar filas de `audits`. No hay migración, no hay cambios en el sync ni en el
  esquema. El dashboard sigue siendo el archivo histórico que la planilla no tiene.

### Números que tienen que dar (los cruza el revisor)

- **CA-24** — Con las filas fijas del tramo anterior y del tramo nuevo (`tasks.md` T1), el
  promedio partido debe dar: tramo anterior **89,4%** en 110 visitas, tramo nuevo **77,0%** en 6
  visitas, y el conjunto completo marcado como mixto, **sin** número único. Agosto 2026 por local,
  verificado en la base el 13/09/2026: General Paz 67,17 · Recta 72,57 · Nueva Córdoba 75,23 ·
  Urca 75,56 · Luuma 85,46 · Carlos Paz 86,04. Julio 2026: 86,4%.

  > El tramo nuevo da **77,005**, no el 76,9 que decía `SPEC.md`. Esa cifra salía de la planilla
  > del Looker, que tiene Luuma en 85,0; la base guarda 85,46. Manda la base, que es de donde lee
  > el tablero.

- **CA-25** — Con la base de hoy (6 auditorías, todas de agosto 2026), la pantalla debe mostrar un
  promedio único de la escala nueva, el aviso del corte, y la sección de evolución en «sin dato»
  (CA-21). Los puntajes se pintan con el corte único de 85 (P1): cumplen Carlos Paz y Luuma, los
  otros cuatro no. Ningún número de pantalla cambia respecto de hoy; cambian los avisos y los
  colores del semáforo de auditoría.

## Preguntas resueltas — respuestas de Daniela, 13/09/2026

Las tres preguntas abiertas de la receta quedaron contestadas antes de implementar. Ninguna
cambió el enfoque; P1 cambió los umbrales y desbloqueó T13.

### P1 — Los umbrales del semáforo de auditoría · RESUELTA

**La escala nueva tiene UN SOLO corte: 85.** Cumple o no cumple: ≥85 cumple, debajo no cumple. No
son cinco niveles. Lo fija **Daniela como criterio de HOLT para el tablero**, no la planilla del
cliente, así que la pantalla **no** dice «a confirmar con el cliente»: es el umbral del tablero y
se muestra como tal.

Las auditorías anteriores al corte conservan los cinco niveles de la planilla vieja (95 · 90 · 70
· 50), que son los suyos y no se tocan.

Con el corte en 85 y las 6 auditorías de agosto 2026 de la base: **cumplen Carlos Paz (86,04) y
Luuma (85,46)**; no cumplen Nueva Córdoba (75,23), General Paz (67,17), Urca (75,56) y Recta
(72,57).

Consecuencias sobre la receta original:

- `NIVELES_AUDITORIA_NUEVA` **no** queda en `null`: arranca con los dos niveles de 85.
- **T13 deja de estar bloqueada.** Entra con el resto de la feature.
- Las dos leyendas provisorias («los cortes de color están a confirmar con el cliente») de T7 y
  T10 **no se escriben**: el criterio existe desde el día uno.
- El semáforo de la escala nueva **se dibuja**. La propuesta provisoria de mostrar esos puntajes
  sin color quedó sin efecto.

El cambio de `Puntaje` (separar «no hay valor» de «no hay semáforo», T5) **se mantiene** por otro
motivo: una auditoría sin fecha legible es de escala desconocida (CA-4) y no tiene semáforo, pero
su puntaje igual se muestra.

### P2 — El histórico de auditorías anteriores a agosto 2026 · RESUELTA

**Sí se va a cargar, pero es otra feature.** No entra en C16: no se implementa ni se diseña acá.

Hasta que esas filas entren, **C16 es un guardarraíl que no se puede ver funcionando en pantalla
con datos de los dos lados del corte**. Con las 6 filas de hoy —todas de agosto 2026— ninguna
pantalla muestra el caso mixto y la serie temporal tiene un solo mes. El caso mixto se verifica
con las filas fijas de `scripts/probar-auditorias.ts` (T1), no con el navegador. El revisor lo
dice así, no lo disfraza de verificado.

Las 110 visitas de ene 2025 – jul 2026 siguen en la planilla del Looker (`Agrupado Looker -
Censurado.xlsx`, hoja `Puntaje auditorias`), que no es la que lee el sync. Cargarlas es una
fuente nueva del sync y va por separado.

### P3 — El corte es el 1 de agosto de 2026 exacto · RESUELTA

**Todas las auditorías de agosto 2026 se hicieron con la planilla nueva.** No hubo período de
transición. El corte es el 01/08/2026 y **alcanza con la fecha**: no hace falta una marca por
auditoría, ninguna columna nueva en `audits` y ninguna migración. El enfoque por fecha de
`design.md` queda confirmado.

## Fuera de scope

- Cargar el histórico de auditorías a la base (P2) y cualquier cambio en el sync, en `audits` o en
  el esquema.
- Recalcular, convertir o equiparar puntajes de las dos escalas. Una tabla de equivalencia entre
  planillas es un invento estadístico, no un dato del cliente.
- El mystery shopper: su planilla no se tocó, sus umbrales no cambian y sus promedios no se
  parten.
- Los umbrales de delivery, que siguen siendo un pendiente aparte.
- Marcar el corte en pantallas que no muestran auditorías (Reseñas, Delivery, Resumen
  administrativo).
- Una serie temporal de mystery shopper: no hace falta para este problema.
- Convertir la tarjeta de conteo de MS y Auditorías en un promedio (CA-7): nadie lo pidió y el
  problema no lo requiere.

## Datos / seguridad

- **Lee:** `audits` y `locations` + `brands`, con las funciones que ya existen (`getAuditorias()`,
  `getMarcasYLocales()`), siempre con `clienteDeLectura()`. Ningún dato nuevo.
- **Escribe:** nada. Sin migraciones (CA-23).
- **Quién:** los mismos de siempre, cualquier mail en `emails_autorizados`. Las dos capas —el
  guard de `(panel)/layout.tsx` + `proxy.ts`, y la RLS de `audits`— no se tocan.
- **Validación de entradas:** el único parámetro nuevo que se lee de la URL no existe: la sección
  de evolución usa el `mes` que ya se valida con `leerMesFiltro()`. La fecha de corte es una
  constante del código, no entra por parámetro.
- **Marca blanca:** la fecha de corte y los umbrales son criterios del cliente, así que van a la
  config central (`marca.ts`), nunca sueltos en un componente. Cliente nuevo = otra config.
