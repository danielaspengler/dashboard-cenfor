-- Delivery: canales de venta por aplicación (Rappi, PedidosYa, Uber).
--
-- Solo Censurado opera delivery. Dentro de Censurado hay dos niveles que el
-- resto del tablero no tiene:
--
--   1. Las marcas B (dark kitchens): Lomos la Catedral, Burger Club, Woops.
--      No son locales propios. Cocinan dentro de un local de Censurado y se
--      venden como marca aparte en las apps. Por eso cuelgan del local, no
--      de `brands`: "Lomos la Catedral - Recta" se prepara en Censurado Recta.
--
--   2. El formato Turbo, la tienda rápida de Rappi. En la planilla aparece
--      como un punto de venta distinto ("Censurado - Urca - Turbo") y se
--      trata como tal: es una operación que el equipo gestiona por separado.
--
-- De ahí `delivery_points`: la unidad que la planilla mide es el punto de
-- venta —local + marca B + formato + canal—, no el local. Un local puede
-- tener varios; ninguno se identifica solo por su nombre.

-- ---------------------------------------------------------------------------
-- Marcas B
-- ---------------------------------------------------------------------------

create table public.sub_brands (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  slug text not null unique,
  name text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.sub_brands is
  'Marcas B (dark kitchens) que operan dentro de los locales de una marca.';

-- ---------------------------------------------------------------------------
-- Puntos de venta
-- ---------------------------------------------------------------------------

create table public.delivery_points (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete restrict,
  sub_brand_id uuid references public.sub_brands (id) on delete restrict,
  channel text not null check (channel in ('rappi', 'pedidos_ya', 'uber')),
  formato text not null default 'normal' check (formato in ('normal', 'turbo')),
  -- Texto exacto de la columna "Punto de venta" de la planilla. Es la llave
  -- con la que el sync encuentra el punto; misma idea que `ms_form_label` y
  -- `audit_sheet_label` en `locations`.
  sheet_label text not null,
  name text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (channel, sheet_label)
);

comment on column public.delivery_points.sheet_label is
  'Texto exacto de "Punto de venta" en la planilla del canal. Si el cliente lo renombra, el sync descarta la fila y lo informa.';

create index delivery_points_location_idx on public.delivery_points (location_id);

-- ---------------------------------------------------------------------------
-- Indicadores por punto de venta y período
-- ---------------------------------------------------------------------------

-- Los períodos son mensuales y vienen calculados por la planilla, que ya
-- normaliza los archivos que baja de la app. El dashboard lee el resultado;
-- no recalcula porcentajes a partir de las órdenes.
create table public.delivery_metrics (
  id uuid primary key default gen_random_uuid(),
  delivery_point_id uuid not null references public.delivery_points (id) on delete cascade,
  period_start date not null,
  period_end date not null,

  cancelaciones_pct numeric,
  ordenes_canceladas integer,
  reclamos_pct numeric,
  ordenes_con_reclamos integer,
  ordenes_mal_estado integer,
  ordenes_producto_diferente integer,
  ordenes_producto_faltante integer,
  disponibilidad_pct numeric,
  ordenes_con_demora_pct numeric,
  compensacion_pagada numeric,
  reclamos_con_compensacion integer,
  calificacion_promedio numeric,
  cantidad_resenas integer,

  source_file_id text,
  created_at timestamptz not null default now(),
  -- Verificado contra la planilla del 07/09/2026: punto + período identifica
  -- una fila sin repetirse (43/43).
  unique (delivery_point_id, period_start, period_end)
);

create index delivery_metrics_periodo_idx on public.delivery_metrics (period_start desc);

-- ---------------------------------------------------------------------------
-- Motivos de reclamo
-- ---------------------------------------------------------------------------

-- Las dos pestañas de motivos —por orden y por producto— tienen las mismas
-- columnas salvo `producto`, así que van en una tabla con `scope` para
-- distinguirlas. Separarlas duplicaría el parser y las consultas.
create table public.delivery_issues (
  id uuid primary key default gen_random_uuid(),
  delivery_point_id uuid not null references public.delivery_points (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  scope text not null check (scope in ('orden', 'producto')),
  motivo text not null,
  detalle text not null default '',
  -- Vacío, no nulo: entra en la clave única y en Postgres dos NULL no chocan,
  -- así que con NULL el dedup dejaría pasar duplicados de las filas por orden.
  producto text not null default '',
  cantidad_ordenes integer not null default 0,
  source_file_id text,
  created_at timestamptz not null default now(),
  -- Verificado el 07/09/2026: sin `period_end` la clave se repite (65/86),
  -- porque la planilla trae dos cargas de agosto —al 24 y al 31—.
  unique (delivery_point_id, period_start, period_end, scope, motivo, detalle, producto)
);

create index delivery_issues_periodo_idx on public.delivery_issues (period_start desc);

-- ---------------------------------------------------------------------------
-- RLS: mismo candado que el resto del tablero
-- ---------------------------------------------------------------------------

alter table public.sub_brands enable row level security;
alter table public.delivery_points enable row level security;
alter table public.delivery_metrics enable row level security;
alter table public.delivery_issues enable row level security;

create policy sub_brands_read on public.sub_brands
  for select using (esta_autorizado());
create policy delivery_points_read on public.delivery_points
  for select using (esta_autorizado());
create policy delivery_metrics_read on public.delivery_metrics
  for select using (esta_autorizado());
create policy delivery_issues_read on public.delivery_issues
  for select using (esta_autorizado());
