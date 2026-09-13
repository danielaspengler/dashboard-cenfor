# Design — C15 · Resumen administrativo

> Criterios en `requirements.md`. Relevamiento y decisiones del 11/09 en `SPEC.md`.

## Enfoque

Una página server component nueva en `(panel)/administracion/resumen`, que lee `financials` una
vez y calcula todo en memoria con las funciones de `src/lib/economico.ts`. El cálculo se arregla
antes de dibujar nada: una sola regla de «qué fila tiene el dato» por indicador, usada por las
tarjetas, la variación, los gráficos y la tabla. Los gráficos son SVG escritos a mano en un
componente de servidor, sin librerías.

Sin migraciones ni cambios de esquema: el dato ya está y la RLS de `financials` ya existe.

## Archivos que se tocan

| Archivo | Qué cambia |
|---|---|
| `src/lib/economico.ts` | Se reescribe `totalizar()` y su tipo `Totales` (ver «Cálculo»). Se suman `variacion()` y `serieMensual()`. Se corrige el comentario de la rentabilidad. `getFinancieros`, `mesesFinancieros`, `delMesFinanciero`, `pesos`, `pesosCortos` quedan igual. Se suma `porcentaje()` para formatear en es-AR. |
| `scripts/probar-economico.ts` (nuevo) | Prueba de `totalizar()` y `variacion()`: primero con filas fijas copiadas de la base, después contra la base viva. Sale con código 1 si un número no da. Mismo patrón que `probar-score.ts`. |
| `src/lib/navigation.ts` | Área «Administración» (`slug: "administracion"`, ícono `Landmark`) con la sección «Resumen administrativo» (`/administracion/resumen`, ícono `ChartColumn`). Se actualiza el comentario del final: vuelve Administración, Marketing sigue afuera. |
| `src/app/(panel)/administracion/resumen/page.tsx` (nuevo) | La pantalla. |
| `src/components/graficos.tsx` (nuevo) | Dos componentes SVG de servidor: `GraficoBarras` y `GraficoLinea`. |
| `src/components/ui.tsx` | `Variacion` recibe una prop opcional `neutra` que la dibuja en `--color-piedra` en vez de verde/rojo. El default no cambia: Delivery sigue igual. |
| `src/components/filtros.tsx` | `FiltroOpciones` recibe una prop opcional `porDefecto`: si el valor elegido es ese, se borra el parámetro de la URL en vez de escribirse. El informe no la pasa y sigue igual. |
| `src/lib/sync/fuentes.ts` | Constante `LOOKER_ECONOMICO = "Informe franquicias Censurado"`, al lado de `PLANILLAS.economico`, que ya lo nombra en un comentario. |

No se tocan: el layout `(panel)`, `sidebar.tsx`, `proxy.ts`, el sync, `financials`, `marca.ts`,
`globals.css`, `src/app/page.tsx` (la raíz sigue yendo a Operaciones).

**Por qué no hace falta tocar el guard ni el menú:** el layout `(panel)` envuelve cualquier ruta
del grupo, así que `/administracion/*` hereda sesión y chequeo de `esta_autorizado` sin cambios.
`proxy.ts` protege todo lo que no está en `PUBLIC_PATHS`. `Sidebar` recorre `NAVIGATION` y marca
la sección activa por `pathname === href`: no asume `/operaciones` en ningún lado.

## Cálculo (`economico.ts`)

### Qué fila tiene el dato

Una sola función decide, por indicador, si una fila entra. Todo lo demás la usa:

| Indicador | La fila entra si… | Por qué |
|---|---|---|
| ventas | `ventas > 0` | |
| órdenes | `ordenes > 0` | Agosto 2026: General Paz y Poeta Lugones vienen vacías. |
| ticket | `ordenes > 0` y `ventas > 0` | Arregla el bug: las ventas de una fila sin órdenes no entran al numerador. |
| % fijos, % variables, compras/ventas | `pct > 0` y `ventas > 0` | Un 0 es sin dato (CA-12). En ene–may 2025 los montos vienen vacíos y los porcentajes en 0. |
| rentabilidad | `rentabilidad !== null`, `ventas > 0` y la fila tiene % variables **y** % fijos | P1 resuelta el 11/09: sin costos variables o fijos, la rentabilidad es sin dato (CA-12b). Saca a Poeta Lugones julio 2026. |

### Totales

`Totales` pasa a devolver, por indicador, un valor y quiénes lo tienen:

```
Medida = { valor: number | null; conDato: string[]; sinDato: string[] }   // location_ids
Totales = { locales: string[]; ventas, ordenes, ticket, costos_fijos_pct,
            costos_variables_pct, compras_ventas_pct, rentabilidad_neta_pct: Medida }
```

- `ventas`, `ordenes`: suma de las filas con el dato.
- `ticket`: `Σ ventas ÷ Σ órdenes` sobre las filas con dato de ticket.
- Los cuatro porcentajes: `Σ (pct × ventas) ÷ Σ ventas` sobre las filas con dato de ese porcentaje.
- `valor` es `null` cuando `conDato` está vacío. Nunca 0 por falta de dato.

**Se sacan de `Totales` `cmv`, `costos_fijos`, `costos_variables` y `cmv_pct`.** Ninguna
pantalla ni script los usa (verificado con grep) y `cmv_pct` tiene el mismo defecto que el ticket.
Arreglar números que nadie muestra es trabajo sin destino. Si mañana se muestran, vuelven con la
regla de arriba.

**Comentario del tipo:** el de `rentabilidad_neta_pct` dice «(Ventas − CMV − fijos − variables) ÷
ventas», que contradice la implementación. Pasa a decir: «La de la planilla, ponderada por ventas.
No se recalcula: los costos variables ya incluyen el CMV».

### Por qué ponderar el % de la planilla y no dividir sumas de montos

Hoy `costos_fijos_pct` del conjunto es `Σ costos_fijos ÷ Σ ventas`. Se cambia a ponderar
`costos_fijos_pct` por ventas, por tres razones:

1. **Dividir sumas tiene el defecto del ticket.** Si una fila trae ventas y no trae costos, sus
   ventas entran al denominador igual. Mayo 2025 da 1,97% (los fijos de Carlos Paz sobre las
   ventas de cinco locales); el número real es 20,86% sobre 1 local. Enero–abril 2025 da vacío
   aunque la planilla trae los porcentajes (en 0, que igual es sin dato).
2. **Donde el dato está completo, dan lo mismo.** En las 102 filas, `costos_fijos_pct` y
   `costos_variables_pct` coinciden con `costos ÷ ventas` (ninguna diferencia mayor a 0,5 puntos),
   y `Σ(pct × ventas) ÷ Σ ventas = Σ costos ÷ Σ ventas`. Agosto 2026: 26,79 por los dos caminos.
3. **Es la misma regla que la rentabilidad**, que ya se pondera así. Las cuatro tarjetas de
   porcentaje se calculan igual y la nota de la pantalla describe una sola cuenta.

Compras/ventas no tiene monto en la base: ponderar el porcentaje es el único camino.

### Variación contra el mes anterior

`variacion(filasMes, filasPrevio, indicador)`:

1. Se toma el mes anterior con datos (`mesAnterior()` de `filtros.ts`).
2. Universo = locales que tienen el dato de ese indicador **en los dos meses**.
3. Se totaliza cada mes sobre ese universo.
4. Ventas, órdenes y ticket devuelven `(actual ÷ anterior − 1) × 100`; los porcentajes, `actual −
   anterior` en puntos.
5. Devuelve `{ delta, locales }` o `null` si el universo está vacío o no hay mes anterior.

La pantalla agrega «mismos N locales» cuando `locales` es menor que el `conDato` de la tarjeta.

### Serie para los gráficos

`serieMensual(filas, hasta, meses = 13)`: para cada mes con datos entre `hasta − 12` y `hasta`,
`{ mes, totales: totalizar(filasDelMes) }`. Los gráficos leen `totales.<indicador>.valor`. Como
sale de `totalizar()`, cada punto usa el mismo criterio que las tarjetas (CA-23).

Rentabilidad por local: la página llama a `serieMensual` con las filas de cada local.

### Formato

- `pesosCortos()` en tarjetas y `pesos()` en la tabla, como dice SPEC.md.
- Órdenes: `Intl.NumberFormat("es-AR")` (`4.600`).
- Porcentajes: `porcentaje(v)` nuevo, `Intl` es-AR con 1 decimal (`26,8%`). `Variacion` recibe
  `escribir` con el mismo formateador: su default usa `toFixed`, que escribe `0.2` con punto, y la
  pantalla mezclaría separadores.

## La pantalla (`page.tsx`)

`export const dynamic = "force-dynamic"`. Datos: `Promise.all([getFinancieros(),
getMarcasYLocales()])`.

1. **Filtros.** Locales con filas = `location_id` distintos de `financials`, cruzados con
   `getMarcasYLocales()` para nombre y slug. `local = leerLocal(filtros.local, slugs)`. Filas
   visibles = todas o las de ese local. `meses = mesesFinancieros(visibles)`, `mes =
   leerMes(filtros.mes, meses)`, `previo = mesAnterior(mes, meses)`.
2. **Encabezado.** `PageHeader` titulo «Resumen administrativo», bajada «Ventas, costos y
   rentabilidad de cada local, por mes». En `extra`: `FiltroOpciones` (rótulo Local, param
   `local`, opción «Todos los locales» con valor `LOCAL_TODOS`, `porDefecto={LOCAL_TODOS}`) y
   `FiltroMeses conTodo={false}`. Mismo orden que Delivery.
3. **Línea de contexto** (el patrón de Delivery): «**Todos los locales · Agosto 2026** · 6 locales
   con datos. Sin datos económicos: Luuma, Nueva Córdoba, Tejeda y Villa Allende (Formaggio).»
   La lista sale de los locales activos sin filas en `financials`, con su marca desde la base.
4. **Tres tarjetas de volumen** (grid de 3). Etiqueta, valor, detalle con cobertura (CA-13),
   `Variacion neutra`.
5. **Cuatro tarjetas de porcentaje** (grid de 4). Igual.
6. **Nota del criterio**, una línea en `text-xs` piedra. Texto propuesto:
   «Porcentajes ponderados por las ventas de cada local, solo del mes elegido. No coinciden con el
   Looker «{LOOKER_ECONOMICO}», que promedia los locales sin ponderar y mezcla períodos.»
7. **Evolución**, cuatro bloques con título de sección (el estilo `h2` con barra de acento de
   Delivery):
   - «Ventas y ticket promedio»: `GraficoBarras` de ventas arriba y `GraficoLinea` de ticket
     abajo, mismo ancho y mismas columnas de meses.
   - «Costos fijos y variables»: `GraficoBarras` con dos series.
   - «Compras sobre ventas»: `GraficoBarras`.
   - «Rentabilidad neta por local»: grilla de `GraficoLinea` chicos (3 columnas en escritorio),
     misma escala Y para todos, título = nombre del local. Con un local elegido, uno solo a
     ancho completo.
   Debajo de cada gráfico, si hay meses sin dato: «Sin dato: enero a mayo 2025».
8. **Tabla del mes** (solo con todos los locales): `Tabla`/`Th`/`Td`, una fila por local,
   ordenada por ventas de mayor a menor. Celdas vacías con `SinDato` «sin dato». P4 resuelta: va.
9. **Vacío total**: si `financials` no trae filas, encabezado + `Card` con `SinDato` «Todavía no
   hay datos económicos cargados. Los trae el sync desde la planilla.»

Para la lista «General Paz y Poeta Lugones» se copia el `enumerar()` de cuatro líneas del informe.
Moverlo a un módulo compartido tocaría el informe por una función de cuatro líneas.

Si `page.tsx` pasa de 500 líneas (CALIDAD.md), la tarjeta con cobertura y variación sale a una
función del mismo archivo o a `src/components/` junto a los gráficos.

## Gráficos (`graficos.tsx`)

Componentes de servidor, sin `"use client"`, sin estado.

- **`GraficoBarras({ meses, series, formato, marcado })`**: `series` es 1 o 2 `{ nombre, valores:
  (number | null)[] }`. Eje Y desde 0 hasta el máximo con un margen, 3 o 4 líneas de guía con su
  valor. Eje X con el mes abreviado (`ago 25`).
- **`GraficoLinea({ meses, valores, formato, marcado, dominio? })`**: línea con puntos. Un `null`
  corta la línea en vez de unirla a través del hueco; un punto aislado se dibuja como punto. Si el
  dominio incluye negativos, línea del cero marcada. `dominio` opcional para compartir la escala
  entre los gráficos por local.
- **Medidas**: `viewBox` fijo, `width="100%"`, altura por la proporción del `viewBox`. El texto
  escala con el ancho y no se deforma.
- **Colores**: solo variables de `globals.css`. Serie 1 `--color-tinta`, serie 2
  `--color-piedra`, guías `--color-borde`, mes elegido con una franja de fondo `--color-nube`.
  Leyenda en texto al lado del título cuando hay dos series. Nada de verde, rojo ni colores de
  marca: la identidad sigue viviendo en `globals.css` y C11 la cambia ahí.
- **Tooltip**: `<title>` dentro de cada barra/punto: «Agosto 2026 · 26,8%» o «Enero 2025 · sin
  dato».
- **Accesibilidad**: `role="img"` y `aria-label` con el título del gráfico.
- **Valor del mes elegido** escrito sobre su barra o punto. Los demás, por tooltip. Con 13 barras,
  un rótulo en cada una se amontona.

## Decisiones de diseño

- **Una función decide si una fila tiene el dato, y todo la usa.** El bug del ticket es un caso de
  «esta fila entró al denominador sin tener numerador». Con la regla en un solo lugar, tarjeta,
  variación, gráfico y tabla no pueden contar distinto.
- **Porcentajes de la planilla ponderados por ventas, no sumas de montos.** Justificado arriba:
  mismo número con datos completos, número correcto con datos incompletos, misma regla que la
  rentabilidad.
- **La cobertura viaja con el valor (`conDato`/`sinDato`).** La tarjeta dice «4 de 6 locales» sin
  recalcular nada, y el script lo verifica.
- **Variación sobre el universo común.** Es la única forma de que un hueco de carga no parezca una
  caída. Mismo criterio que Delivery con el local.
- **Ventas y ticket en dos paneles alineados, no un gráfico de dos ejes.** Dos escalas en un
  mismo gráfico invitan a leer cruces de líneas que no significan nada.
- **Rentabilidad por local en gráficos chicos con la misma escala, no seis líneas de colores.**
  Seis líneas necesitan seis colores (no hay paleta en `marca.ts` y no se inventa una), se pisan,
  y Poeta Lugones tiene dos puntos. Con la misma escala se comparan igual.
- **13 meses en los gráficos.** Muestra el mismo mes del año anterior y entra bien con 13 barras.
  Es una constante (P3, confirmada por Daniela el 11/09).
- **El nombre del Looker va en `fuentes.ts`.** Es el nombre de una fuente del cliente, como las
  hojas y planillas de ese archivo, que ya es la config por cliente del sync. Cliente nuevo =
  otro `fuentes.ts`.
- **`Variacion` con prop `neutra` y `FiltroOpciones` con prop `porDefecto`.** Dos props opcionales
  que no cambian a quien ya las usa. Copiar los componentes duplicaría código.
- **No se usa `FiltroLocal`** de Delivery: muestra «(n)» con los puntos de venta, que acá no
  existen.

## Caminos descartados

- **Recalcular la rentabilidad como ventas − costos.** Decidido el 11/09: los variables ya
  incluyen el CMV y da −37% sobre 2026.
- **Dejar `Σ costos ÷ Σ ventas` para fijos y variables.** Tiene el defecto del ticket en ene–may
  2025 (ver «Por qué ponderar»).
- **Usar la columna `ticket_promedio` de la base.** Viene vacía en 24 filas (ene–may 2025) y en 0
  en otras 4 (Nueva Córdoba oct y nov 2025, General Paz y Poeta Lugones ago 2026). Ventas ÷ órdenes está siempre que haya órdenes.
- **Sumar una librería de gráficos** (Recharts, Chart.js): decidido el 11/09, sin dependencias. Y
  obligaría a componentes de cliente para algo estático.
- **Barras de HTML con `width: %`, como el informe.** Sirven para una barra suelta de 0 a 100. No
  sirven para ejes, negativos, líneas ni meses alineados.
- **Minigráfica en la tarjeta de órdenes**, como el Looker: repite el primer gráfico.
- **Variación solo en órdenes**, como el Looker: la regla del universo común sirve igual para las
  siete, y dejar seis sin variación sería arbitrario.
- **Paleta de colores nueva en `marca.ts`** para los gráficos: la paleta llega con C11. Con dos
  tonos de gris alcanza.
- **Una tabla o vista SQL con los totales mensuales.** Son 102 filas que crecen seis por mes: en
  memoria alcanza, y una vista duplicaría la regla del sin dato en SQL.

## Seguridad

- Solo lectura, con `clienteDeLectura()`. En producción lee con la sesión y decide la RLS
  (`financials_read` → `esta_autorizado()`). Con `MODO_DEMO=1` usa la clave de servidor, solo en
  local.
- Guard en dos capas sin cambios: `proxy.ts` (sesión) + `(panel)/layout.tsx` (`esta_autorizado`).
- Entradas: `mes` y `local` solo se aceptan si están en la lista de disponibles. Nada de la URL
  llega a una consulta: se filtra en memoria.
- No se loguea ningún número. `getFinancieros()` ya loguea el `error` de la consulta, sin datos.

## Riesgos

- **P1 y P2 cambian julio 2026 y el acumulado.** Resueltas el 11/09: la regla vive en una sola
  función y el script verifica los números con las dos respuestas aplicadas.
- **`scripts/probar-economico.ts` no carga `economico.ts` fuera de Next**, porque importa
  `@/lib/demo` → `supabase/server` → `next/headers`. `probar-score.ts` ya resuelve `@/` con tsx.
  Mitigación: es lo primero que se prueba (T1). Si falla, las funciones puras pasan a
  `src/lib/economico-calculo.ts`, sin imports, y `economico.ts` las reexporta. No se hace antes de
  saber que hace falta.
- **Una fila de `financials` de un local inactivo o sin nombre** quedaría sin nombre en tarjetas y
  tabla (`getMarcasYLocales()` trae solo activos). Hoy no hay ninguna: Alta Córdoba tiene 0 filas.
  Mitigación: la página muestra «local sin nombre» en vez de ocultar la fila.
- **Escala compartida en rentabilidad por local.** El 93,57 de Poeta Lugones aplastaría a los
  otros cinco. Con P1 resuelta ese punto no existe.
- **Texto que escala con el `viewBox`** puede quedar chico en pantallas angostas. Mitigación: el
  revisor lo mira a 1280 px y a 390 px de ancho.
- **Números que la pantalla le muestra al cliente** y que no coinciden con su Looker. Mitigación: la
  nota del criterio, decidida el 11/09.
