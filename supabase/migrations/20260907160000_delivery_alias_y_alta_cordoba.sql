-- Tres correcciones al modelo de delivery, con lo que confirmó el cliente
-- el 07/09/2026 sobre los puntos de venta que no cerraban.
--
-- 1. "Censurado - Alta Córdoba" es un local que dejó de operar. Tiene datos
--    reales de julio y agosto de 2026, así que entra como local inactivo:
--    el histórico es válido para el período en que operó, y `activo = false`
--    lo deja fuera de las pantallas, que filtran por esa columna.
--
-- 2. "Censurado - Olga Orozco 3023" es Poeta Lugones. La misma planilla lo
--    llama de dos maneras: por el nombre en la hoja de indicadores y por la
--    dirección en las de motivos. De ahí la tabla de etiquetas: un punto de
--    venta puede aparecer con más de un nombre, y hardcodear uno solo haría
--    que la mitad de sus motivos se descarten sin que nadie lo note.
--
-- 3. Woops no vende por Rappi, solo por PedidosYa y Uber. No hay nada que
--    corregir: queda sembrada como marca B, sin puntos en este canal.

-- ---------------------------------------------------------------------------
-- 1. El local que dejó de operar
-- ---------------------------------------------------------------------------

insert into public.locations (brand_id, slug, name, city, activo)
select b.id, 'censurado-alta-cordoba', 'Alta Córdoba', 'Córdoba', false
from public.brands b
where b.slug = 'censurado'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Etiquetas de planilla, una tabla aparte
-- ---------------------------------------------------------------------------

-- La FK compuesta contra (id, channel) evita que una etiqueta quede colgada
-- de un punto de otro canal, que es la única forma de que la unicidad por
-- canal mienta.
alter table public.delivery_points add constraint delivery_points_id_channel_key
  unique (id, channel);

create table public.delivery_point_labels (
  id uuid primary key default gen_random_uuid(),
  delivery_point_id uuid not null,
  channel text not null,
  sheet_label text not null,
  created_at timestamptz not null default now(),
  unique (channel, sheet_label),
  foreign key (delivery_point_id, channel)
    references public.delivery_points (id, channel) on delete cascade
);

comment on table public.delivery_point_labels is
  'Cómo nombra cada planilla a un punto de venta. Un mismo punto puede tener varias etiquetas: Rappi llama a Poeta Lugones por su nombre en una hoja y por su dirección en otra.';

create index delivery_point_labels_punto_idx
  on public.delivery_point_labels (delivery_point_id);

-- Las etiquetas ya sembradas pasan a la tabla nueva.
insert into public.delivery_point_labels (delivery_point_id, channel, sheet_label)
select id, channel, sheet_label from public.delivery_points
on conflict (channel, sheet_label) do nothing;

-- Y la columna vieja se va: dos lugares para el mismo dato terminan en dos
-- verdades distintas.
alter table public.delivery_points drop column sheet_label;

alter table public.delivery_point_labels enable row level security;
create policy delivery_point_labels_read on public.delivery_point_labels
  for select using (esta_autorizado());

-- ---------------------------------------------------------------------------
-- 3. El punto de venta de Alta Córdoba y el alias de Poeta Lugones
-- ---------------------------------------------------------------------------

insert into public.delivery_points (location_id, sub_brand_id, channel, formato, name, activo)
select l.id, null, 'rappi', 'normal', 'Censurado · Alta Córdoba', false
from public.locations l
where l.slug = 'censurado-alta-cordoba'
  and not exists (
    select 1 from public.delivery_point_labels
    where channel = 'rappi' and sheet_label = 'Censurado - Alta Córdoba'
  );

insert into public.delivery_point_labels (delivery_point_id, channel, sheet_label)
select dp.id, 'rappi', 'Censurado - Alta Córdoba'
from public.delivery_points dp
join public.locations l on l.id = dp.location_id
where l.slug = 'censurado-alta-cordoba' and dp.channel = 'rappi'
on conflict (channel, sheet_label) do nothing;

insert into public.delivery_point_labels (delivery_point_id, channel, sheet_label)
select dp.id, 'rappi', 'Censurado - Olga Orozco 3023'
from public.delivery_points dp
join public.locations l on l.id = dp.location_id
where l.slug = 'censurado-poeta-lugones'
  and dp.channel = 'rappi'
  and dp.sub_brand_id is null
  and dp.formato = 'normal'
on conflict (channel, sheet_label) do nothing;
