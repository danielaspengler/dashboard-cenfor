-- Los números económicos de cada local, mes a mes.
--
-- Séptima fuente del sync, y la primera que no es de calidad: ventas, órdenes,
-- ticket promedio, CMV, rentabilidad y estructura de costos. Sale de la
-- planilla que alimenta el Looker «Informe franquicias Censurado», hoja
-- «Agrupado Looker».
--
-- Tres decisiones:
--
-- 1. UNA FILA POR LOCAL Y POR MES, con las columnas fijas. Acá NO se usa el
--    modelo de catálogo que tiene delivery: aquel existe porque cada app
--    publica indicadores distintos que casi no se superponen. Estas trece
--    columnas son las mismas para todos los locales y no cambian de una
--    sucursal a otra: una tabla común se lee mejor y se consulta más simple.
--
-- 2. LOS PORCENTAJES SE GUARDAN EN 0–100, como en el resto del tablero. La
--    planilla los trae en 0–1 (0,118 es 11,8%) y el parser los normaliza al
--    guardar, no al mostrar.
--
-- 3. LA RENTABILIDAD PUEDE SER NEGATIVA y así se guarda. Julio de 2025 en
--    Nueva Córdoba dio -7,33%: un mes con pérdida es un dato, no un error.

create table if not exists public.financials (
  id                    uuid primary key default gen_random_uuid(),
  location_id           uuid references public.locations(id) on delete cascade,
  -- Primer día del mes. El dato es un cierre mensual, como el de delivery.
  period_start          date not null,
  ventas                numeric,
  ordenes               integer,
  ticket_promedio       numeric,
  cmv                   numeric,
  rentabilidad_neta_pct numeric,
  costos_fijos          numeric,
  costos_variables      numeric,
  compras_ventas_pct    numeric,
  costos_fijos_pct      numeric,
  costos_variables_pct  numeric,
  -- "Local Propio" o "Franquicia", tal como lo declara la planilla.
  tipo_local            text,
  source_row_hash       text unique not null,
  created_at            timestamptz not null default now()
);

create index if not exists idx_financials_loc_period
  on public.financials(location_id, period_start desc);

-- El nombre con el que esta planilla llama a cada local. "Recta Martinolli"
-- es "Recta" en el tablero, y el resto de las fuentes ya tienen su propia
-- columna de equivalencia: se sigue el mismo camino en vez de inventar otro.
alter table public.locations
  add column if not exists looker_label text;

update public.locations set looker_label = 'Recta Martinolli'  where slug = 'censurado-recta';
update public.locations set looker_label = 'Carlos Paz'        where slug = 'censurado-carlos-paz';
update public.locations set looker_label = 'General Paz'       where slug = 'censurado-general-paz';
update public.locations set looker_label = 'Urca'              where slug = 'censurado-urca';
update public.locations set looker_label = 'Poeta Lugones'     where slug = 'censurado-poeta-lugones';
update public.locations set looker_label = 'Nueva Cordoba'     where slug = 'censurado-nueva-cordoba';
-- Luuma no aparece en esta planilla y Formaggio no tiene datos económicos
-- cargados: quedan en null a propósito. Una fila cuyo local no matchea se
-- descarta y se informa, como en todas las demás fuentes.

-- RLS: el mismo candado que el resto del tablero. Quien está en
-- emails_autorizados lee; nadie escribe desde el cliente (escribe el sync con
-- la clave de servicio, que ignora RLS).
alter table public.financials enable row level security;

drop policy if exists financials_read on public.financials;
create policy financials_read on public.financials
  for select using (public.esta_autorizado());
