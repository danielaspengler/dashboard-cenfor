# Requirements — C15 · Resumen administrativo

> Relevamiento completo y decisiones del 11/09/2026 en `SPEC.md` (misma carpeta). Este archivo
> no las repite: las convierte en criterios verificables.

## Problema / objetivo

Daniela y CENFOR miran los números económicos de los locales en un Looker que mezcla períodos y
promedia locales sin ponderar. El dato ya está en `financials`. Falta la pantalla que lo muestre
con el criterio del tablero: un solo mes, ponderado por ventas, y diciendo qué falta.

## Lo que dice la base (consultado el 11/09/2026, además de lo que ya está en SPEC.md)

Tres cosas que no estaban relevadas y que cambian cómo se calcula:

| Hallazgo | Filas | Consecuencia |
|---|---|---|
| **Enero–abril 2025 (5 locales) y mayo 2025 (4 de 5)**: los montos (CMV, costos fijos, costos variables), la rentabilidad y el ticket vienen **vacíos**, y los tres porcentajes de la planilla (% fijos, % variables, compras/ventas) vienen en **0**. Ventas y órdenes sí están. | 24 | `sum(costos_fijos) ÷ sum(ventas)` da vacío en ene–abr y **1,97%** en mayo 2025 (los fijos de un local sobre las ventas de cinco): el mismo defecto del ticket. El % bien calculado de mayo es 20,86 (1 de 5 locales). |
| **Poeta Lugones, julio 2026** (su primer mes): costos variables, CMV y compras en 0; fijos $1,5 M (agosto: $7,1 M); rentabilidad **93,57%**. | 1 | Contada, esa fila llevaría la rentabilidad de julio de 3,44 a 14,19 y la de 2026 de 3,86 a 5,39. P1 resuelta: no entra (CA-12b). |
| **General Paz y Poeta Lugones, agosto 2026**: órdenes vacías y `ticket_promedio` guardado en 0. **Nueva Córdoba oct y nov 2025**: órdenes cargadas y `ticket_promedio` en 0. | 4 | El ticket guardado no sirve: se recalcula siempre como ventas ÷ órdenes, solo sobre filas con órdenes. |

Verificado además: en las 102 filas, donde hay montos, `costos_fijos_pct` y `costos_variables_pct`
coinciden con `costos ÷ ventas` (ninguna diferencia mayor a 0,5 puntos). Ponderar el porcentaje
de la planilla por ventas da el mismo número que dividir sumas cuando el universo está completo,
y sigue funcionando cuando no lo está.

## Criterios de aceptación (estilo EARS)

### Acceso y navegación
- **CA-1** — El menú lateral debe mostrar un área nueva «Administración», debajo de Operaciones,
  con la sección «Resumen administrativo» que lleva a `/administracion/resumen`.
- **CA-2** — Cuando alguien sin sesión abre `/administracion/resumen`, el sistema debe mandarlo
  al login; cuando entra un mail que no está en `emails_autorizados`, debe ver «Sin acceso», igual
  que en el resto del tablero.
- **CA-3** — Cuando se cambia de sección desde el menú, el mes y el local elegidos deben viajar
  en la URL; un mes o un local que la otra pantalla no tiene cae en su default sin romperla.

### Filtros
- **CA-4** — La pantalla debe tener dos filtros en el encabezado, con los componentes del
  tablero: «Local» (Todos los locales + los locales con al menos una fila en `financials`) y
  «Fecha» (`FiltroMeses` **sin «Todo»**). Los dos viven en la URL (`?local=…&mes=YYYY-MM`) y la
  página sigue siendo server component.
- **CA-5** — Cuando no hay `mes` en la URL, el sistema debe mostrar el mes más reciente con datos
  (hoy agosto 2026). Cuando el valor es un mes o un slug que no existe, debe caer en el default
  sin error.
- **CA-6** — Cuando se elige un local, los meses ofrecidos deben ser solo los de ese local
  (Poeta Lugones: julio y agosto 2026) y **toda** la pantalla se recalcula para ese local.
- **CA-7** — El local por defecto (`todos`) no se escribe en la URL, como el mes por defecto.

### Tarjetas del mes
- **CA-8** — La pantalla debe mostrar tres tarjetas de volumen (Ventas, Órdenes, Ticket promedio)
  y cuatro de porcentaje (% costos fijos, % costos variables, Compras/ventas, Rentabilidad neta),
  todas del mes elegido.
- **CA-9** — Ventas y órdenes deben ser la suma de los locales que tienen el dato. Las ventas van
  con `pesosCortos()` (`$ 188,5 M`).
- **CA-10** — El ticket promedio debe ser `ventas ÷ órdenes` calculado **solo sobre las filas con
  órdenes mayores a 0**. Agosto 2026, todos los locales: **$ 27.827** (hoy `totalizar()` da
  $ 40.970). La columna `ticket_promedio` de la base no se usa.
- **CA-11** — Los cuatro porcentajes deben ser el porcentaje de la planilla **ponderado por las
  ventas** de cada local, sobre las filas que tienen el dato. La rentabilidad no se recalcula a
  partir de los costos.
- **CA-12** — Un **0** en % costos fijos, % costos variables o compras/ventas debe tratarse como
  sin dato: no entra en el promedio ni en el conteo de locales con dato.
- **CA-12b** — Cuando una fila no tiene % costos variables o % costos fijos (0 o vacío), su
  rentabilidad debe tratarse como sin dato, aunque la planilla traiga un valor (P1). Poeta Lugones
  julio 2026 no entra y la tarjeta lo dice en la cobertura.
- **CA-13** — Cuando a un indicador le faltan locales en el mes, la tarjeta debe decir cuántos y
  cuáles: «4 de 6 locales · sin dato en General Paz y Poeta Lugones». Cuando están todos, dice
  «6 de 6 locales». Con un local elegido, solo se aclara si falta el dato.
- **CA-14** — Cuando ningún local tiene el dato (ej. % fijos en enero 2025), la tarjeta debe
  decir «sin dato» y no mostrar 0 ni 0%.

### Variación contra el mes anterior
- **CA-15** — Cada tarjeta debe mostrar la variación contra el mes anterior con datos,
  **calculada solo sobre los locales que tienen ese indicador en los dos meses**. Ventas, órdenes
  y ticket varían en %; los porcentajes, en puntos.
- **CA-16** — Cuando ese universo es menor que el de la tarjeta, la variación debe decirlo
  («vs julio, mismos 4 locales»). Órdenes agosto vs julio: **▲ 0,2%**, nunca −31%.
- **CA-17** — La variación no debe llevar color verde ni rojo. Cuando no hay mes anterior o
  ningún local tiene el dato en los dos meses, no se muestra.

### Criterio y vacíos
- **CA-18** — La pantalla debe tener **una línea** que diga que los porcentajes están ponderados
  por ventas y que no coinciden con el Looker «Informe franquicias Censurado» porque aquel
  promedia locales sin ponderar y mezcla períodos. El nombre del Looker sale de config, no del
  componente.
- **CA-19** — La pantalla debe decir qué locales activos no tienen datos económicos (hoy Luuma y
  los tres de Formaggio), con los nombres que vienen de la base. No los dibuja con ceros ni les
  arma filas vacías.
- **CA-20** — Ningún número, barra ni línea de la pantalla debe ir pintado con colores de
  semáforo (verde/rojo) ni con umbrales.
- **CA-21** — Los textos de la pantalla usan frases cortas con el dato adelante, dicen «sin dato»
  donde falta algo y llevan como mucho una raya (—) visible en toda la pantalla.

### Evolución (gráficos SVG, sin dependencias nuevas)
- **CA-22** — La pantalla debe mostrar la evolución de los **13 meses que terminan en el mes
  elegido** (el mes y los 12 anteriores, solo los que tienen datos), con el mes elegido marcado:
  1. Ventas por mes (barras) y ticket promedio por mes (línea), en dos paneles alineados sobre el
     mismo eje de meses.
  2. % costos fijos y % costos variables por mes (barras de a pares).
  3. Compras/ventas por mes (barras).
  4. Rentabilidad neta por local: un gráfico chico de línea por local, todos con la misma escala
     y la línea del cero marcada cuando hay valores negativos.
- **CA-23** — Cada punto de los gráficos debe salir del mismo cálculo que las tarjetas (mismo
  criterio de ponderación y de sin dato). La barra de agosto 2026 del gráfico de ventas mide lo
  mismo que la tarjeta.
- **CA-24** — Un mes sin dato no se dibuja como cero: queda el hueco y, debajo del gráfico, una
  línea dice qué meses no tienen dato («Sin dato: enero a mayo 2025»).
- **CA-25** — Pasar el mouse por una barra o un punto debe mostrar el mes y el valor (tooltip
  nativo del SVG).

### Tabla del mes
- **CA-26** — Con «Todos los locales», la pantalla debe mostrar una tabla del mes elegido con una
  fila por local: Ventas (`pesos()`), Órdenes, Ticket, % fijos, % variables, Compras/ventas,
  Rentabilidad. Una celda sin dato dice «sin dato». Con un local elegido, la tabla no aparece.

### Estados vacíos
- **CA-27** — Cuando `financials` no tiene ninguna fila (o la consulta falla), la pantalla debe
  decir «Todavía no hay datos económicos cargados» y no dibujar tarjetas ni gráficos en cero. El
  error de la consulta queda en el log del servidor (ya lo hace `getFinancieros()`).

### Números que tienen que dar (los cruza el revisor)
- **CA-28** — Con todos los locales, la pantalla debe mostrar (redondeo a 1 decimal en tarjetas):

  | | Agosto 2026 | Julio 2026 |
  |---|---|---|
  | Ventas | $ 188,5 M · 6 de 6 | $ 195,5 M · 6 de 6 |
  | Órdenes | 4.600 · 4 de 6 | 6.708 · 6 de 6 |
  | Ticket | $ 27.827 · 4 de 6 | $ 29.137 · 6 de 6 |
  | % fijos | 26,8% (26,79) · 6 de 6 | 23,4% (23,42) · 6 de 6 |
  | % variables | 62,1% (62,12) · 6 de 6 | 70,1% (70,11) · 5 de 6 |
  | Compras/ventas | 43,7% (43,71) · 6 de 6 | 43,0% (43,01) · 5 de 6 |
  | Rentabilidad | 10,4% (10,43) · 6 de 6 | 3,4% (3,44) · 5 de 6 · sin dato en Poeta Lugones (P1) |

  Variación agosto vs julio: ventas ▼ 3,6% · órdenes ▲ 0,2% (mismos 4 locales) · ticket ▼ 3,5%
  (mismos 4 locales) · % fijos ▲ 3,4 pts · % variables ▼ 6,7 pts (mismos 5) · compras ▲ 1,2 pts
  (mismos 5) · rentabilidad ▲ 6,6 pts (mismos 5).
  Sin redondear: −3,576% · +0,240% · −3,488% · +3,368 · −6,739 · +1,241 · +6,586.

  Bordes: mayo 2025 → % fijos 20,9% · 1 de 5 locales, ticket $ 20.323 · 5 de 5. Enero 2025 → los
  cuatro porcentajes «sin dato», ventas $ 99,5 M, órdenes 4.981, ticket $ 19.967.

- **CA-29** — Sobre enero–agosto 2026 (se verifica con el script, la pantalla no tiene acumulado):
  ventas $ 1.370.642.355 · órdenes 48.967 · ticket 26.756 · % fijos 25,43 · compras 43,91 ·
  % variables **69,64** (CA-12, P2) · rentabilidad **3,86** (CA-12b, P1).

## Fuera de scope

- Acumulados o «Todo»: la pantalla es de a un mes (decisión del 11/09).
- CMV, montos de costos y tipo de local (propio/franquicia) en pantalla: no están en el Looker ni
  se pidieron.
- Semáforos, umbrales, metas.
- Roles o permisos por sección: ven todos los autorizados.
- Minigráfica dentro de la tarjeta de órdenes (la del Looker): la evolución ya está en los gráficos.
- Exportar o imprimir la pantalla.
- Cambios en el sync, en `financials` o migraciones: el dato ya está.
- Corregir la planilla del cliente (ver «Para avisar al cliente»).

## Datos / seguridad

- **Lee:** `financials` (todas las filas, hoy 102) y `locations` + `brands` activos, con
  `clienteDeLectura()`: sesión de la persona en producción, clave de servidor solo con `MODO_DEMO=1`.
- **Escribe:** nada.
- **Quién:** cualquier mail en `emails_autorizados`. Dos capas que ya existen: el guard de
  `(panel)/layout.tsx` + `proxy.ts`, y la policy `financials_read` (`esta_autorizado()`). Hoy eso
  significa Daniela y Denise Lagos (CENFOR), que pasan a ver ventas, costos y márgenes de los seis
  locales. Decidido por Daniela el 11/09.
- **Validación de entradas:** `mes` y `local` se aceptan solo si están en la lista de valores
  disponibles (`leerMes`, `leerLocal`); cualquier otro valor cae en el default. No hay otros
  parámetros.

## Preguntas (resueltas por Daniela el 11/09/2026)

- **P1 — Poeta Lugones julio 2026: ¿su rentabilidad cuenta?** — **Resuelta: no entra.** La fila
  está incompleta: variables, CMV y compras en 0, fijos $1,5 M contra $7,1 M en agosto, y la
  planilla calcula 93,57% de rentabilidad. **Regla general:** si los costos variables **o los
  fijos** de una fila son sin dato (0 o vacío), su rentabilidad también es sin dato. Julio 2026
  da **3,44%** (5 de 6 locales), 2026 da **3,86%**, la variación de agosto sale **▲ 6,6 pts**
  (mismos 5). La pantalla avisa que ese local no tiene el dato ese mes (la cobertura de la
  tarjeta: «5 de 6 locales · sin dato en Poeta Lugones»).
- **P2 — Un 0 en % fijos y % variables también es «sin dato»?** — **Resuelta: sí**, igual que
  compras/ventas (CA-12). Julio % variables 70,11 (5 de 6); acumulado 2026 de variables **69,64**.
- **P3 — Ventana de los gráficos** — **Resuelta: 13 meses** (el elegido y los 12 anteriores).
- **P4 — ¿Va la tabla por local del mes (CA-26)?** — **Resuelta: sí**, solo con «Todos los
  locales».

## Para avisar al cliente (no bloquea la pantalla)

- Agosto 2026: General Paz y Poeta Lugones sin órdenes cargadas.
- Poeta Lugones julio 2026: costos variables, CMV y compras vacíos.
- Nueva Córdoba octubre y noviembre 2025: ticket promedio en 0 con las órdenes cargadas.
- Enero–mayo 2025: sin costos ni rentabilidad (salvo Carlos Paz en mayo).
- Sigue abierto con ellos qué mide Compras/ventas y cómo se compone la rentabilidad (SPEC.md).
