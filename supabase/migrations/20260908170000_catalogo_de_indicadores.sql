-- Los indicadores de delivery dejan de ser columnas y pasan a ser datos.
--
-- Motivo: los tres canales miden cosas distintas y casi no se superponen.
-- Rappi publica 13 indicadores, Uber 14 y PedidosYa 9, y solo dos conceptos
-- existen en los tres —disponibilidad y calificación—, cada uno definido a su
-- manera: Rappi mide "Disponibilidad %", Uber "Tiempo en línea" y PedidosYa
-- "Hora no disponible", que es el mismo concepto invertido y en horas.
--
-- Con una columna por indicador quedaba una tabla de ~35 columnas donde cada
-- fila usa un tercio, y cada cambio en el reporte de cualquiera de las tres
-- apps pedía una migración. Con un catálogo, sumar un canal es sembrar sus
-- indicadores y escribir su parser.
--
-- El catálogo además maneja la pantalla: qué entra en las tarjetas, en qué
-- orden van las columnas y si subir es bueno o malo sale de acá, no de una
-- lista en el código.

-- ---------------------------------------------------------------------------
-- Qué mide cada canal
-- ---------------------------------------------------------------------------

create table public.delivery_metric_defs (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('rappi', 'pedidos_ya', 'uber')),
  clave text not null,
  nombre text not null,
  -- pct: siempre 0-100 · minutos: siempre minutos · pesos · conteo ·
  -- puntaje (1-5) · texto (el único indicador que no es número).
  unidad text not null check (unidad in ('pct', 'conteo', 'pesos', 'minutos', 'puntaje', 'texto')),
  -- Si bajar es lo bueno. Lo usa la variación mes a mes para pintar la flecha:
  -- en reclamos bajar es bueno y en disponibilidad es malo.
  mejor_si_baja boolean not null default false,
  -- Entra en las tarjetas de arriba. El resto vive en la tabla.
  destacado boolean not null default false,
  orden integer not null default 0,
  -- Encabezado EXACTO de la planilla. Misma idea que `ms_form_label`,
  -- `audit_sheet_label` y `delivery_point_labels`, aplicada a las columnas:
  -- si el cliente renombra una, el sync avisa en vez de leer la de al lado.
  sheet_header text not null,
  -- Clave del indicador que da el peso para promediar este. La calificación
  -- de Rappi se pondera por cantidad de reseñas y la de PedidosYa por N
  -- evaluaciones; la de Uber no se puede, porque Uber no publica cuántas son.
  -- Sin esto, un local con 25 reseñas pesaría lo mismo que uno con 1.
  pondera_con text,
  created_at timestamptz not null default now(),
  unique (channel, clave),
  unique (channel, sheet_header)
);

comment on table public.delivery_metric_defs is
  'Qué indicador publica cada app de delivery, con su unidad y su encabezado en la planilla.';

-- ---------------------------------------------------------------------------
-- Los valores
-- ---------------------------------------------------------------------------

create table public.delivery_metric_values (
  id uuid primary key default gen_random_uuid(),
  delivery_point_id uuid not null references public.delivery_points (id) on delete cascade,
  metric_def_id uuid not null references public.delivery_metric_defs (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  -- `valor` y `texto` son excluyentes: casi todos los indicadores son números,
  -- y "Top artículos incorrectos" de Uber es una cadena. Guardarlo en la misma
  -- columna obligaría a que todo fuera texto y a parsear al leer.
  valor numeric,
  texto text,
  source_file_id text,
  created_at timestamptz not null default now(),
  -- El período completo entra en la clave, como en `delivery_issues`: la
  -- planilla de Rappi trae dos cargas de agosto, cerradas al 24 y al 31.
  unique (delivery_point_id, metric_def_id, period_start, period_end)
);

create index delivery_metric_values_periodo_idx
  on public.delivery_metric_values (period_start desc);
create index delivery_metric_values_punto_idx
  on public.delivery_metric_values (delivery_point_id);

-- ---------------------------------------------------------------------------
-- RLS: el mismo candado que el resto del tablero
-- ---------------------------------------------------------------------------

alter table public.delivery_metric_defs enable row level security;
alter table public.delivery_metric_values enable row level security;

create policy delivery_metric_defs_read on public.delivery_metric_defs
  for select using (esta_autorizado());
create policy delivery_metric_values_read on public.delivery_metric_values
  for select using (esta_autorizado());

-- ---------------------------------------------------------------------------
-- Catálogo de Rappi
-- ---------------------------------------------------------------------------

insert into public.delivery_metric_defs
  (channel, clave, nombre, unidad, mejor_si_baja, destacado, orden, sheet_header, pondera_con)
values
  ('rappi', 'reclamos_pct', 'Reclamos', 'pct', true, true, 1, 'Reclamos %', null),
  ('rappi', 'ordenes_con_reclamos', 'Órdenes con reclamos', 'conteo', true, false, 2, 'Órdenes con reclamos', null),
  ('rappi', 'cancelaciones_pct', 'Cancelaciones', 'pct', true, true, 3, 'Cancelaciones %', null),
  ('rappi', 'ordenes_canceladas', 'Órdenes canceladas', 'conteo', true, false, 4, 'Órdenes canceladas', null),
  ('rappi', 'ordenes_con_demora_pct', 'Órdenes con demora', 'pct', true, true, 5, 'Órdenes con demora %', null),
  ('rappi', 'disponibilidad_pct', 'Disponibilidad', 'pct', false, true, 6, 'Disponibilidad %', null),
  ('rappi', 'calificacion_promedio', 'Calificación', 'puntaje', false, true, 7, 'Calificación promedio', 'cantidad_resenas'),
  ('rappi', 'cantidad_resenas', 'Reseñas', 'conteo', false, false, 8, 'Cantidad de reseñas', null),
  ('rappi', 'ordenes_mal_estado', 'Órdenes en mal estado', 'conteo', true, false, 9, 'Órdenes mal estado', null),
  ('rappi', 'ordenes_producto_diferente', 'Órdenes con producto diferente', 'conteo', true, false, 10, 'Órdenes producto diferente', null),
  ('rappi', 'ordenes_producto_faltante', 'Órdenes con producto faltante', 'conteo', true, false, 11, 'Órdenes producto faltante', null),
  ('rappi', 'compensacion_pagada', 'Compensación pagada', 'pesos', true, false, 12, 'Compensación pagada por restaurante', null),
  ('rappi', 'reclamos_con_compensacion', 'Reclamos con compensación', 'conteo', true, false, 13, 'Cantidad reclamos con compensación', null);

-- ---------------------------------------------------------------------------
-- Los 43 registros de Rappi que ya estaban, al modelo nuevo
-- ---------------------------------------------------------------------------

-- Un `values` lateral en vez de trece inserts: el mismo criterio en un solo
-- lugar. Los enteros se castean porque todas las filas van a la misma columna.
insert into public.delivery_metric_values
  (delivery_point_id, metric_def_id, period_start, period_end, valor, source_file_id)
select m.delivery_point_id, d.id, m.period_start, m.period_end, v.valor, m.source_file_id
from public.delivery_metrics m
cross join lateral (values
  ('reclamos_pct', m.reclamos_pct),
  ('ordenes_con_reclamos', m.ordenes_con_reclamos::numeric),
  ('cancelaciones_pct', m.cancelaciones_pct),
  ('ordenes_canceladas', m.ordenes_canceladas::numeric),
  ('ordenes_con_demora_pct', m.ordenes_con_demora_pct),
  ('disponibilidad_pct', m.disponibilidad_pct),
  ('calificacion_promedio', m.calificacion_promedio),
  ('cantidad_resenas', m.cantidad_resenas::numeric),
  ('ordenes_mal_estado', m.ordenes_mal_estado::numeric),
  ('ordenes_producto_diferente', m.ordenes_producto_diferente::numeric),
  ('ordenes_producto_faltante', m.ordenes_producto_faltante::numeric),
  ('compensacion_pagada', m.compensacion_pagada),
  ('reclamos_con_compensacion', m.reclamos_con_compensacion::numeric)
) as v(clave, valor)
join public.delivery_metric_defs d on d.channel = 'rappi' and d.clave = v.clave
where v.valor is not null
on conflict do nothing;

-- `delivery_metrics` NO se borra acá. Se compara antes contra la copia y se
-- borra en su propia migración: una tabla con datos del cliente no se tira en
-- el mismo paso en que se copia.
