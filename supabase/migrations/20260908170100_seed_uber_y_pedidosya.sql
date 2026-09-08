-- Uber y PedidosYa: sus indicadores y sus puntos de venta.
--
-- Relevado el 08/09/2026 de las dos planillas vivas. Las unidades salieron de
-- leer los valores FORMATEADOS, no los crudos: sin formato son todas
-- fracciones indistinguibles. En Uber "Tiempo de espera evitable" es 0,00102,
-- que la planilla muestra como 0:01:28 —una duración—, y en PedidosYa la
-- columna con el MISMO NOMBRE es 0,4493, que muestra como 44,9% —un
-- porcentaje—. Sin mirar el formato, las dos se habrían guardado igual.
--
-- Por eso el catálogo guarda la unidad: el parser convierte al guardar
-- (porcentaje a 0-100, duración a minutos) y la pantalla no tiene que saber
-- de dónde salió cada número.

-- ---------------------------------------------------------------------------
-- Catálogo de Uber
-- ---------------------------------------------------------------------------

-- Uber es el único de los tres que publica el volumen: "Pedidos completados".
-- Con eso sus porcentajes se pueden ponderar por pedidos, cosa que en Rappi y
-- PedidosYa no se puede. Los dos porcentajes que NO se ponderan por pedidos
-- son "% Pedidos incorrectos" y "% Errores calidad y sabor": son la
-- composición de los errores, no una tasa sobre el total de pedidos.
--
-- Uber publica Score pero no cuántas evaluaciones lo forman, así que su
-- calificación va en promedio simple. Es una diferencia real entre apps y la
-- pantalla la declara.
insert into public.delivery_metric_defs
  (channel, clave, nombre, unidad, mejor_si_baja, destacado, orden, sheet_header, pondera_con)
values
  ('uber', 'pedidos_completados', 'Pedidos completados', 'conteo', false, true, 1, 'Pedidos completados', null),
  ('uber', 'pedidos_con_errores_pct', 'Pedidos con errores', 'pct', true, true, 2, '% pedidos con erroress', 'pedidos_completados'),
  ('uber', 'pedidos_con_errores', 'Pedidos con errores', 'conteo', true, false, 3, 'Pedidos con errores', null),
  ('uber', 'importe_contracargo', 'Importe de contracargo', 'pesos', true, true, 4, 'Importe de contracargo', null),
  ('uber', 'pedidos_contracargo_pct', 'Pedidos con contracargo', 'pct', true, false, 5, '% Pedidos con contrarecargo', 'pedidos_completados'),
  ('uber', 'pedidos_contracargo', 'Pedidos con contracargo', 'conteo', true, false, 6, 'Pedidos con contrarecargo', null),
  ('uber', 'pedidos_incorrectos_pct', 'Pedidos incorrectos', 'pct', true, false, 7, '% Pedidos incorrectos', null),
  ('uber', 'errores_calidad_sabor_pct', 'Errores de calidad y sabor', 'pct', true, false, 8, '% Errores calidad y sabor', null),
  ('uber', 'pedidos_no_completados', 'Pedidos no completados', 'conteo', true, false, 9, 'Pedidos no completados', null),
  ('uber', 'tiempo_espera_evitable', 'Tiempo de espera evitable', 'minutos', true, false, 10, 'Tiempo de espera evitable', null),
  ('uber', 'pedidos_con_espera', 'Pedidos con tiempo de espera', 'conteo', true, false, 11, 'Pedidos con tiempo de espera evitable', null),
  ('uber', 'tiempo_en_linea', 'Tiempo en línea', 'pct', false, true, 12, 'Tiempo en linea', null),
  ('uber', 'score', 'Calificación', 'puntaje', false, true, 13, 'Score', null),
  ('uber', 'top_articulo_incorrecto', 'Artículo incorrecto más frecuente', 'texto', false, false, 14, 'Top articulos incorrectos', null);

-- ---------------------------------------------------------------------------
-- Catálogo de PedidosYa
-- ---------------------------------------------------------------------------

-- "Hora no disponible" es el concepto invertido de la disponibilidad de Rappi
-- y del tiempo en línea de Uber: acá cuenta las horas que la tienda estuvo
-- caída, así que subir es malo. No se convierte a "disponibilidad" para no
-- inventar un número que la app no publica.
--
-- PedidosYa sí trae "N evaluaciones", así que su calificación se pondera.
insert into public.delivery_metric_defs
  (channel, clave, nombre, unidad, mejor_si_baja, destacado, orden, sheet_header, pondera_con)
values
  ('pedidos_ya', 'pedidos_con_reclamos_pct', 'Pedidos con reclamos', 'pct', true, true, 1, 'Pedidos con reclamos', null),
  ('pedidos_ya', 'hora_no_disponible', 'Hora no disponible', 'minutos', true, true, 2, 'Hora no disponible', null),
  ('pedidos_ya', 'cancelacion_evitable_pct', 'Cancelación evitable', 'pct', true, true, 3, 'Cancelación evitable', null),
  ('pedidos_ya', 'tiempo_preparacion', 'Tiempo de preparación', 'minutos', true, true, 4, 'Tiempo de preparación promedio', null),
  ('pedidos_ya', 'score', 'Calificación', 'puntaje', false, true, 5, 'Score', 'n_evaluaciones'),
  ('pedidos_ya', 'n_evaluaciones', 'Evaluaciones', 'conteo', false, false, 6, 'N evaluaciones', null),
  ('pedidos_ya', 'evaluaciones_1_estrella', 'Evaluaciones de 1 estrella', 'conteo', true, false, 7, 'Evaluaciones 1 estrella', null),
  ('pedidos_ya', 'tiempo_espera_evitable_pct', 'Tiempo de espera evitable', 'pct', true, false, 8, 'Tiempo de espera evitable', null),
  ('pedidos_ya', 'pedidos_listos_pct', 'Pedidos marcados como listos', 'pct', false, false, 9, 'Pedidos marcados como listos', null);

-- ---------------------------------------------------------------------------
-- Puntos de venta de los dos canales nuevos
-- ---------------------------------------------------------------------------

-- Un punto de venta por canal, aunque sea la misma cocina: cada app mide y
-- gestiona su tienda por separado, y los indicadores no son comparables entre
-- canales. "Censurado · Urca" existe tres veces, una por app.
--
-- Las tres tiendas de Lomos la Catedral que Uber trae sin datos en julio ni
-- agosto (General Paz, Urca, Recta) entran igual: Daniela confirmó el
-- 08/09/2026 que operan. Van a aparecer sin datos hasta que vendan, que es
-- distinto de aparecer en cero.
--
-- Woops aparece por primera vez, en PedidosYa: no vende por Rappi.
with nuevos (channel, local_slug, marca_b, name, sheet_label) as (values
  -- Uber
  ('uber', 'censurado-nueva-cordoba', null,                'Censurado · Nueva Córdoba',         'Censurado Nueva Cordoba'),
  ('uber', 'censurado-poeta-lugones', null,                'Censurado · Poeta Lugones',         'Censurado - Poeta Lugones'),
  ('uber', 'censurado-recta',         null,                'Censurado · Recta',                 'Censurado - Recta Martinolli'),
  ('uber', 'censurado-urca',          null,                'Censurado · Urca',                  'Censurado - Urca'),
  ('uber', 'censurado-nueva-cordoba', 'lomos-la-catedral', 'Lomos la Catedral · Nueva Córdoba', 'Lomos La Catedral - Nva Cba'),
  ('uber', 'censurado-general-paz',   'lomos-la-catedral', 'Lomos la Catedral · General Paz',   'Lomos La Catedral -  General Paz'),
  ('uber', 'censurado-urca',          'lomos-la-catedral', 'Lomos la Catedral · Urca',          'La Catedral - Urca'),
  ('uber', 'censurado-recta',         'lomos-la-catedral', 'Lomos la Catedral · Recta',         'La Catedral - Recta Martinolli'),
  -- PedidosYa
  ('pedidos_ya', 'censurado-urca',          null,                'Censurado · Urca',                  'Censurado Urca'),
  ('pedidos_ya', 'censurado-carlos-paz',    null,                'Censurado · Carlos Paz',            'Censurado Carlos Paz'),
  ('pedidos_ya', 'censurado-general-paz',   null,                'Censurado · General Paz',           'Censurado General Paz'),
  ('pedidos_ya', 'censurado-recta',         null,                'Censurado · Recta',                 'Censurado - Recta'),
  ('pedidos_ya', 'censurado-nueva-cordoba', null,                'Censurado · Nueva Córdoba',         'Censurado Nva Cordoba'),
  ('pedidos_ya', 'censurado-poeta-lugones', null,                'Censurado · Poeta Lugones',         'Censurado Lugones'),
  ('pedidos_ya', 'censurado-carlos-paz',    'lomos-la-catedral', 'Lomos la Catedral · Carlos Paz',    'Lomos La catedral Carlos Paz'),
  ('pedidos_ya', 'censurado-urca',          'lomos-la-catedral', 'Lomos la Catedral · Urca',          'Lomos La Catedral Urca'),
  ('pedidos_ya', 'censurado-recta',         'lomos-la-catedral', 'Lomos la Catedral · Recta',         'Lomos La catedral Recta'),
  ('pedidos_ya', 'censurado-nueva-cordoba', 'lomos-la-catedral', 'Lomos la Catedral · Nueva Córdoba', 'Lomos La catedral Nva Cba'),
  ('pedidos_ya', 'censurado-general-paz',   'lomos-la-catedral', 'Lomos la Catedral · General Paz',   'Lomos La Catedral Gral Paz'),
  ('pedidos_ya', 'censurado-recta',         'woops',             'Woops · Recta',                     'Woops Recta Martinolli'),
  ('pedidos_ya', 'censurado-carlos-paz',    'woops',             'Woops · Carlos Paz',                'Woops Carlos paz'),
  ('pedidos_ya', 'censurado-urca',          'woops',             'Woops · Urca',                      'Woops Urca'),
  ('pedidos_ya', 'censurado-general-paz',   'woops',             'Woops · General Paz',               'Woops General Paz'),
  ('pedidos_ya', 'censurado-nueva-cordoba', 'woops',             'Woops · Nueva Córdoba',             'Woops Nueva Cordoba')
),
insertados as (
  insert into public.delivery_points (location_id, sub_brand_id, channel, formato, name, activo)
  select l.id, sb.id, n.channel, 'normal', n.name, true
  from nuevos n
  join public.locations l on l.slug = n.local_slug
  left join public.sub_brands sb on sb.slug = n.marca_b
  where not exists (
    select 1 from public.delivery_point_labels dl
    where dl.channel = n.channel and dl.sheet_label = n.sheet_label
  )
  returning id, channel, name
)
insert into public.delivery_point_labels (delivery_point_id, channel, sheet_label)
select i.id, n.channel, n.sheet_label
from insertados i
join nuevos n on n.channel = i.channel and n.name = i.name
on conflict (channel, sheet_label) do nothing;
