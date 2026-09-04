-- ============================================================
-- Dashboard CENFOR — esquema inicial del área Operaciones
--
-- Diferencia central con el maestro de Papanato: CENFOR es una
-- sociedad con DOS marcas (Censurado y Formaggio), así que hay
-- una tabla `brands` por encima de `locations`. Papanato no la
-- tiene porque es una sola marca.
--
-- Consecuencia práctica: "Nueva Córdoba" existe en las dos
-- marcas. Ningún local se identifica solo por su nombre; toda
-- búsqueda por texto se hace dentro de una marca.
-- ============================================================

-- 1) DIMENSIONES ------------------------------------------------

create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.areas (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.locations (
  id       uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  slug     text unique not null,
  name     text not null,
  city     text,

  -- Llaves de matcheo con cada fuente. Viven acá y no en el código
  -- para que sumar un local sea cargar una fila, no tocar un sync.
  --
  -- google_place_id: llave real de las reseñas. El nombre de la ficha
  -- cambia cuando el cliente lo edita en Maps; el placeId no.
  google_place_id   text unique,
  -- Texto exacto con el que el formulario de mystery shopper nombra
  -- este local. Se compara SIEMPRE dentro de la marca: Formaggio
  -- escribe "Nueva Cordoba" y Censurado "Nueva Córdoba".
  ms_form_label     text,
  -- Valor del campo LOCAL dentro de la pestaña de auditoría (no el
  -- nombre de la pestaña, que no es confiable).
  audit_sheet_label text,

  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_locations_brand on public.locations(brand_id);

-- 2) PERFILES Y ACCESOS ----------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'encargado' check (role in ('direccion','encargado')),
  brand_id   uuid references public.brands(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column public.profiles.brand_id is
  'Marca a la que pertenece un encargado. Null = ve las dos. Para dirección se ignora.';

create table public.encargado_accesos (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  area_slug  text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, area_slug)
);

-- 3) HECHOS -----------------------------------------------------

-- Reseñas de Google Maps, una fila por reseña.
-- `google_review_id` es la huella natural: viene única y estable de
-- la fuente, así que no hace falta construir un hash.
create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  location_id      uuid references public.locations(id) on delete cascade,
  platform         text not null default 'google' check (platform in ('google')),
  google_review_id text unique not null,
  author           text,
  review_date      date,
  rating           numeric,
  rating_max       int not null default 5,
  text             text,
  source           text,
  created_at       timestamptz not null default now()
);

create index idx_reviews_loc_date on public.reviews(location_id, review_date desc);

-- Foto del acumulado histórico de cada local en Google, una fila por
-- corrida del sync. La planilla se pisa a sí misma en cada scrapeo;
-- guardando una fila por corrida el dashboard SÍ puede mostrar la
-- evolución del acumulado, que en la fuente se pierde.
create table public.review_snapshots (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references public.locations(id) on delete cascade,
  scraped_on    date not null,
  scraped_at    timestamptz,
  reviews_count int,
  total_score   numeric,
  created_at    timestamptz not null default now(),
  unique (location_id, scraped_on)
);

-- Visitas de mystery shopper. El puntaje y la clasificación NO se
-- calculan acá: vienen ya resueltos de la hoja "Puntajes por Visita"
-- de cada planilla, que es configurable por el cliente. El dashboard
-- lee el resultado.
create table public.mystery_shopper_visits (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid references public.locations(id) on delete cascade,
  form_timestamp  timestamptz,
  visit_date      date,
  evaluator       text,
  -- Solo Censurado tiene delivery. Formaggio es siempre take_away.
  experience_type text not null default 'take_away'
                    check (experience_type in ('take_away','delivery')),
  score_pct       numeric,
  points_obtained numeric,
  points_max      numeric,
  -- Excelente / Bueno / Regular / Deficiente — cuatro niveles, tal
  -- como los define la planilla (>=90 / >=75 / >=60 / resto).
  classification  text,
  -- % por sección (asesoramiento, experiencia en el local, calidad de
  -- producto, NPS). Estructura distinta entre marcas: por eso jsonb.
  sections        jsonb,
  -- La planilla marca "⚠ Revisar Config" cuando el motor no encontró
  -- una respuesta en su tabla de puntajes: ese puntaje está mal
  -- calculado y no debe entrar a ningún promedio.
  needs_review    boolean not null default false,
  source          text,
  source_row_hash text unique not null,
  created_at      timestamptz not null default now()
);

create index idx_ms_loc_date on public.mystery_shopper_visits(location_id, visit_date desc);

-- Auditorías presenciales (solo Censurado). La planilla de origen es
-- una plantilla con una pestaña por local que guarda UNA sola
-- auditoría, la última: no tiene historial. Guardando cada corrida
-- acá, el dashboard se vuelve el archivo histórico que la fuente no
-- tiene, aunque el cliente pise la pestaña.
create table public.audits (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid references public.locations(id) on delete cascade,
  audit_date      date not null,
  auditor         text,
  franchisee      text,
  score_pct       numeric,
  categories      jsonb,
  source_sheet    text,
  source_row_hash text unique not null,
  created_at      timestamptz not null default now()
);

create index idx_audits_loc_date on public.audits(location_id, audit_date desc);

-- 4) RLS --------------------------------------------------------
-- El candado real está acá, en la base. El control de la app
-- (exigirAcceso) es solo para no mostrar pantallas que vendrían
-- vacías. Fail-closed: sin perfil, no se ve nada.
--
-- Nadie escribe desde el cliente: la escritura la hace únicamente el
-- sincronizador con service_role, que saltea RLS por diseño. Por eso
-- no se crean policies de insert/update/delete.

alter table public.brands                 enable row level security;
alter table public.areas                  enable row level security;
alter table public.locations              enable row level security;
alter table public.profiles               enable row level security;
alter table public.encargado_accesos      enable row level security;
alter table public.reviews                enable row level security;
alter table public.review_snapshots       enable row level security;
alter table public.mystery_shopper_visits enable row level security;
alter table public.audits                 enable row level security;

-- Helpers. security definer para poder leer profiles sin caer en
-- recursión de policies; search_path fijo para que no se pueda
-- secuestrar la resolución de nombres.
create or replace function public.es_direccion()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'direccion'
  );
$$;

create or replace function public.ve_area(area text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_direccion() or exists (
    select 1 from public.encargado_accesos ea
    where ea.profile_id = auth.uid() and ea.area_slug = area
  );
$$;

-- Devuelve true si el usuario puede ver datos de esa marca.
-- Dirección ve todo. Un encargado con brand_id null ve las dos.
create or replace function public.ve_marca(marca uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.es_direccion() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.brand_id is null or p.brand_id = marca)
  );
$$;

-- Catálogos: cualquier usuario logueado. No son datos sensibles y el
-- menú los necesita para dibujarse. `anon` queda afuera a propósito.
create policy "brands_read"    on public.brands    for select to authenticated using (true);
create policy "areas_read"     on public.areas     for select to authenticated using (true);
create policy "locations_read" on public.locations for select to authenticated
  using (public.ve_marca(brand_id));

-- Cada usuario lee su propio perfil y sus propios accesos.
create policy "profiles_read_own" on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "accesos_read_own"  on public.encargado_accesos for select to authenticated
  using (auth.uid() = profile_id);

-- Hechos: hay que tener el área "operaciones" Y la marca del local.
create policy "reviews_read" on public.reviews for select to authenticated
  using (
    public.ve_area('operaciones')
    and exists (
      select 1 from public.locations l
      where l.id = reviews.location_id and public.ve_marca(l.brand_id)
    )
  );

create policy "review_snapshots_read" on public.review_snapshots for select to authenticated
  using (
    public.ve_area('operaciones')
    and exists (
      select 1 from public.locations l
      where l.id = review_snapshots.location_id and public.ve_marca(l.brand_id)
    )
  );

create policy "ms_read" on public.mystery_shopper_visits for select to authenticated
  using (
    public.ve_area('operaciones')
    and exists (
      select 1 from public.locations l
      where l.id = mystery_shopper_visits.location_id and public.ve_marca(l.brand_id)
    )
  );

create policy "audits_read" on public.audits for select to authenticated
  using (
    public.ve_area('operaciones')
    and exists (
      select 1 from public.locations l
      where l.id = audits.location_id and public.ve_marca(l.brand_id)
    )
  );

-- Cerrar la puerta a anon de forma explícita, no por omisión.
revoke all on all tables in schema public from anon;
