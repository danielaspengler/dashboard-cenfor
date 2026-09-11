# C15 — Resumen administrativo

> Estado al 11/09/2026: **el dato ya está en la base y se actualiza solo.** Falta la
> pantalla. Esta receta tiene todo lo necesario para construirla sin volver a relevar nada.
>
> Referencia: el Looker «Informe franquicias Censurado»
> (`datastudio.google.com/reporting/78970b4d-3bca-4425-bf78-a993422a7b2a`), que Daniela mira
> hoy. **No se puede abrir desde acá**: Looker Studio dibuja todo con JavaScript y pide
> sesión de Google, así que la referencia son las dos capturas que pasó el 11/09.

## Qué hay hecho

| Pieza | Estado |
|---|---|
| Tabla `financials` (una fila por local y mes, 13 columnas) | lista, migración `20260911120000` |
| Séptima fuente del sync, desde la planilla que alimenta el Looker | corriendo · 102 filas, cero descartadas |
| Equivalencia de nombres («Recta Martinolli» → Recta), en `locations.looker_label` | lista |
| Capa de datos: `src/lib/economico.ts` (consulta, totales, formato de pesos) | lista |
| **La pantalla** | **falta** |
| Área «Administración» en el menú | falta — vuelve agregándola a `NAVIGATION` |

Alcance del dato: **enero 2025 → agosto 2026**, 20 meses, **seis locales de Censurado**
(Carlos Paz, General Paz, Nueva Córdoba, Poeta Lugones, Recta, Urca). Luuma no está en esa
planilla y Formaggio no tiene datos económicos. **Poeta Lugones tiene solo 2 meses.**

## Lo que muestra el Looker, bloque por bloque

**Encabezado.** Título sobre fondo negro con letras amarillas, y dos filtros: período y local.

**Tres tarjetas grandes, en columna a la izquierda:** Ventas (`1.370,6 M`), Ticket promedio
(`25.122,54`), Órdenes (`48.967`) — esta última con su variación (`▼ 19,3%`) y una
minigráfica de línea.

**Gráfico combinado**, al lado de las tarjetas: barras de Ventas por mes + línea de Ticket
promedio, con dos ejes.

**Cuatro tarjetas de porcentaje**, en fila: % costos fijos (`18,51%`), % costos variables
(`53,52%`), Compras/ventas (`42,02%`), Rentabilidad neta (`4,94%`).

**Tres gráficos abajo:** barras de % costos fijos contra % costos variables por mes; barras
de % compras por mes; y líneas de rentabilidad por local, una por cada uno de los cinco.

## Cómo llega el Looker a esos números — y por qué hay que decidir

Se reconstruyeron los cálculos contra la base. **Las tarjetas mezclan dos períodos
distintos**, y eso es lo primero que hay que resolver antes de copiar nada:

| Tarjeta | Valor | Cómo se reproduce exactamente |
|---|---|---|
| Ventas | 1.370,6 M | suma de **2026** (enero–agosto) |
| Órdenes | 48.967 | suma de **2026** |
| Ticket promedio | 25.122,54 | promedio simple de **los 20 meses**, ignorando las filas en cero |
| % costos fijos | 18,51 % | promedio simple de **las 102 filas**, todo el histórico |
| % costos variables | 53,52 % | ídem |
| Rentabilidad neta | 4,94 % | ídem |
| Compras/ventas | 42,02 % | **no se pudo reproducir**: el promedio de todo da 33,29 % y, sin las 25 filas en cero, 44,10 % |

O sea: las dos primeras tarjetas hablan de 2026 y las otras cinco del promedio de veinte
meses, sin que la pantalla lo diga. Un local que mejoró mucho en 2026 queda diluido por su
propio 2025.

**Además, los porcentajes son promedios simples entre locales.** Nueva Córdoba factura diez
veces más que Poeta Lugones y los dos pesan igual en el 4,94 %.

## Decisiones a tomar con Daniela (bloqueantes para la pantalla)

1. **¿Los totales se recalculan o se promedian?** El tablero ya tiene criterio para esto en
   delivery —los conteos se suman, las tasas se promedian, y cuando hay con qué, se
   ponderan—. Aplicarlo acá daría números **distintos de los que el cliente vio en el
   Looker**: la rentabilidad de 2026 pasa de 4,90 % (promedio simple) a otra cifra ponderada
   por ventas. Hay que elegir y decirlo en pantalla.
2. **¿Qué período muestra cada tarjeta?** La propuesta: **un solo período para toda la
   pantalla**, el mes elegido en el filtro, igual que las otras cinco pantallas del tablero.
   Se pierde el «acumulado» del Looker, se gana que todo hable del mismo lapso.
3. **Qué es exactamente «Compras/ventas»** y por qué 25 de las 102 filas lo traen en cero.
4. **Cómo se compone la rentabilidad.** En esta planilla **los costos variables ya incluyen
   el CMV**: junio 2025 de Nueva Córdoba tiene ventas $57,3 M, CMV $26,2 M y variables
   $40,7 M, que sumados a los fijos superan la facturación. Por eso el tablero **no
   recalcula** el margen: toma el de la planilla y lo pondera por ventas. Confirmar la
   composición antes de mostrar cualquier cuenta propia.
5. **La caída de órdenes de agosto**: 4.600 contra 6.708 en julio, con ventas casi iguales.
   ¿Mes incompleto en la planilla o caída real?

## Cómo construir la pantalla

- **Área nueva «Administración»** en `src/lib/navigation.ts`, con «Resumen administrativo»
  adentro. Es lo que Daniela eligió: el menú pasa a tener dos áreas y queda claro que lo
  económico es otra cosa que lo operativo.
- **Ruta:** `/administracion/resumen`.
- **Filtros:** los mismos componentes de siempre —`FiltroMeses` sin «Todo» (son cierres
  mensuales, como delivery) y `FiltroOpciones` para el local—. Viven en la URL.
- **Formato:** `pesosCortos()` para las tarjetas (`$ 188,5 M`) y `pesos()` para las tablas,
  los dos ya escritos en `src/lib/economico.ts`.
- **Gráficos:** el tablero no tiene ninguno todavía. Las barras y líneas del Looker se pueden
  hacer con SVG a mano —como las barras del informe por local— sin sumar una dependencia.
- **Nada de semáforos inventados.** CENFOR no definió qué rentabilidad es buena. Un número
  pintado de rojo se lee como criterio del cliente.

## Quién lo ve

Decisión de Daniela del 11/09/2026: **todos los autorizados, incluido el cliente.** No se
construyen roles. Vale registrar que hoy `emails_autorizados` tiene a Daniela y a Denise
Lagos (CENFOR), y que publicar esta sección les muestra ventas, costos y márgenes de los
seis locales.
