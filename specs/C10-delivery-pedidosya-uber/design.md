# Design — C10 · Delivery de PedidosYa y Uber

## Enfoque

Los indicadores dejan de ser columnas y pasan a ser filas de un catálogo. Cada canal declara
qué mide —clave, nombre, unidad, si subir es bueno, en qué encabezado viene— y los valores van
a una tabla común. Con eso, las tres planillas las lee **un solo parser** manejado por el
catálogo, y la pantalla dibuja los indicadores del canal elegido sin saber cuáles son. Lo de
Rappi se migra al modelo nuevo y la tabla vieja se borra.

## Esquema nuevo

```sql
delivery_metric_defs
  channel · clave · nombre · unidad · mejor_si_baja · destacado · orden · sheet_header
  unique (channel, clave) · unique (channel, sheet_header)

delivery_metric_values
  delivery_point_id · metric_def_id · period_start · period_end · valor · texto · source_file_id
  unique (delivery_point_id, metric_def_id, period_start, period_end)
```

- `unidad`: `pct` (0–100) · `conteo` · `pesos` · `minutos` · `puntaje` · `texto`.
- `destacado` decide qué entra en las tarjetas de arriba; `orden` ordena las columnas de la
  tabla. Así el catálogo define la pantalla y no hay una lista de indicadores en el código.
- `texto` es una columna aparte de `valor` para "Top artículos incorrectos", el único
  indicador que no es un número.
- `delivery_issues` (motivos de Rappi) **no se toca**: es otra forma de dato —una fila por
  motivo, no un valor por período— y solo Rappi la tiene.

## Archivos que se tocan

- `supabase/migrations/20260908170000_catalogo_de_indicadores.sql` — tablas nuevas, RLS, los
  13 indicadores de Rappi y la copia de sus 43 registros a valores.
- `supabase/migrations/20260908170100_seed_uber_y_pedidosya.sql` — los 23 indicadores de los
  dos canales nuevos, sus 24 puntos de venta y sus etiquetas de planilla.
- `supabase/migrations/20260908180000_borrar_delivery_metrics.sql` — la tabla vieja, en su
  PROPIA migración: se borra después de comparar los agregados, no en el mismo paso en que se
  copia.
- `src/lib/parsers/delivery.ts` — `parseIndicadores(filas, defs, columnas)`, que
  reemplaza a `parseDeliveryMetrics`. `parseDeliveryIssues` queda igual.
- `src/lib/sync/fuentes.ts` — las tres entradas de `CANALES_DELIVERY`, cada una con su
  planilla, su hoja y cómo trae el período.
- `src/lib/sync/ejecutar.ts` — el sync de delivery recorre los tres canales; cada uno en su
  try/catch, como las otras fuentes.
- `src/lib/delivery.ts` (nuevo) — consultas del catálogo y de los valores, y cómo se agrega
  cada indicador. Sale de `data.ts` porque es otro modelo: el resto del tablero lee tablas de
  columnas fijas y acá los indicadores son datos.
- `src/app/(panel)/operaciones/delivery/page.tsx` — filtro de canal, tarjetas y tabla armadas
  desde el catálogo, motivos solo en Rappi.
- `src/components/filtros.tsx` — `FiltroCanal`.

## Decisiones de diseño

- **El período se normaliza a inicio y fin de mes en el parser, no en la base.** Rappi trae dos
  columnas, Uber `07/2026` y PedidosYa `2026-07`. Guardar el rango completo mantiene lo que ya
  funciona para Rappi (donde agosto viene cerrado al 24 y al 31) sin inventarle a los otros dos
  un cierre que no tienen.
- **Los valores se normalizan al guardar, no al mostrar.** Un porcentaje siempre en 0–100, una
  duración siempre en minutos. Si la conversión viviera en la pantalla, cada lugar que muestre
  el dato tendría que repetirla, y el primero que se olvide muestra 0,0219%.
- **El catálogo guarda el encabezado exacto de la planilla** (`sheet_header`), como ya hacen
  `ms_form_label`, `audit_sheet_label` y `delivery_point_labels`. Es la misma idea aplicada a
  las columnas: si el cliente renombra una, el sync avisa en vez de leer la de al lado.
- **Una fila sin período se saltea en silencio; una fila con período y sin punto de venta se
  descarta con aviso.** Son dos cosas distintas: la primera es la plantilla de la planilla
  (176 filas en PedidosYa), la segunda es una tienda nueva o renombrada, que es justo lo que
  hay que enterarse.
- **El filtro de canal vive en la URL** (`?canal=uber&mes=2026-07`), como los demás. La
  pantalla sigue siendo componente de servidor.
- **Default del filtro: Rappi**, que es el canal con más datos y el que ya se estaba mirando.

## Caminos descartados

- **Agregar las columnas de Uber y PedidosYa a `delivery_metrics`.** Quedaba una tabla de ~35
  columnas donde cada fila usa un tercio, y cada cambio de reporte de cualquiera de las tres
  apps pedía una migración. Decisión de Daniela el 08/09/2026.
- **Una vista "Todos los canales".** Solo disponibilidad y calificación existen en los tres, y
  ni siquiera igual: Rappi mide "Disponibilidad %", Uber "Tiempo en línea" y PedidosYa "Hora no
  disponible", que es el concepto invertido y en horas. Un promedio de las tres sería un número
  que no existe en ninguna app. Decisión de Daniela el 08/09/2026.
- **Una tabla por canal.** Tres esquemas para el mismo concepto, y la pantalla con tres
  caminos de lectura.

## Riesgos

- **La migración de Rappi pierde o cambia números.** Mitigación: CA-11 compara la pantalla
  contra los valores de agosto verificados el 08/09, y el conteo 43 filas → 43 × indicadores
  con valor se chequea en SQL antes de borrar la tabla vieja.
- **`drop table delivery_metrics` es irreversible.** Mitigación: va en su propia migración,
  aplicada después de comparar los siete agregados de agosto —dieron idénticos hasta el cuarto
  decimal—, y el sync reconstruye todo desde la planilla en 6 segundos: la planilla es la
  fuente, la base es la copia.
- **Los nombres de tienda de Uber vienen sucios** ("Censurado - Poeta Lugones " con espacio al
  final, "Lomos La Catedral -  General Paz" con dos espacios). Mitigación: el matcheo compara
  normalizando espacios, como ya hace `locales.ts`.
- **Puntos que no existen en la base.** PedidosYa suma Woops (5) y tiendas de Censurado y Lomos
  que hoy solo están dadas de alta para Rappi. El seed los crea explícitamente: 24 puntos
  nuevos, cada uno con su etiqueta de planilla.
