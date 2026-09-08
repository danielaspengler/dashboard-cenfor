-- Seed de delivery: marcas B y los puntos de venta de Rappi.
--
-- Los puntos salen del relevamiento de la planilla del 07/09/2026: 22 valores
-- distintos en la columna "Punto de venta". Se siembran 21. Falta
-- "Censurado - Alta Córdoba" —y "Censurado - Olga Orozco 3023", que aparece
-- solo en las pestañas de motivos—: no corresponden a ninguno de los diez
-- locales y el cliente todavía no confirmó a cuál pertenecen. Hasta entonces
-- el sync los descarta y los informa, en vez de colgarlos del local
-- equivocado.
--
-- Woops se siembra como marca B aunque no venda por Rappi: existe en la
-- operación y los otros dos canales todavía no se relevaron.
--
-- Todo resuelto por slug, no por uuid: los ids se generan en cada base.

insert into public.sub_brands (brand_id, slug, name)
select b.id, v.slug, v.name
from public.brands b
cross join (values
  ('lomos-la-catedral', 'Lomos la Catedral'),
  ('burger-club',       'Burger Club'),
  ('woops',             'Woops')
) as v(slug, name)
where b.slug = 'censurado'
on conflict (slug) do nothing;

-- Puntos de venta de Rappi.
--
-- `sub_marca` vacío significa la marca principal, Censurado. El formato
-- 'turbo' es la tienda rápida de Rappi: la planilla la trae como un punto de
-- venta distinto y el tablero la muestra igual, como una fila propia.
with datos(sheet_label, local_slug, sub_marca, formato, name) as (values
  -- Censurado
  ('Censurado - Carlos Paz',                    'censurado-carlos-paz',    '', 'normal', 'Censurado · Carlos Paz'),
  ('Censurado - General Paz',                   'censurado-general-paz',   '', 'normal', 'Censurado · General Paz'),
  ('Censurado - General Paz - Turbo',           'censurado-general-paz',   '', 'turbo',  'Censurado · General Paz · Turbo'),
  ('Censurado - Nueva Córdoba',                 'censurado-nueva-cordoba', '', 'normal', 'Censurado · Nueva Córdoba'),
  ('Censurado - Nueva Córdoba - Turbo',         'censurado-nueva-cordoba', '', 'turbo',  'Censurado · Nueva Córdoba · Turbo'),
  ('Censurado - Poeta Lugones',                 'censurado-poeta-lugones', '', 'normal', 'Censurado · Poeta Lugones'),
  ('Censurado - Recta',                         'censurado-recta',         '', 'normal', 'Censurado · Recta'),
  ('Censurado - Urca',                          'censurado-urca',          '', 'normal', 'Censurado · Urca'),
  ('Censurado - Urca - Turbo',                  'censurado-urca',          '', 'turbo',  'Censurado · Urca · Turbo'),
  -- Burger Club
  ('Burger Club - Carlos Paz',                  'censurado-carlos-paz',    'burger-club', 'normal', 'Burger Club · Carlos Paz'),
  ('Burger Club - General Paz',                 'censurado-general-paz',   'burger-club', 'normal', 'Burger Club · General Paz'),
  ('Burger Club - Nueva Córdoba',               'censurado-nueva-cordoba', 'burger-club', 'normal', 'Burger Club · Nueva Córdoba'),
  ('Burger Club - Recta',                       'censurado-recta',         'burger-club', 'normal', 'Burger Club · Recta'),
  ('Burger Club - Urca',                        'censurado-urca',          'burger-club', 'normal', 'Burger Club · Urca'),
  -- Lomos la Catedral
  ('Lomos la Catedral - Carlos Paz',            'censurado-carlos-paz',    'lomos-la-catedral', 'normal', 'Lomos la Catedral · Carlos Paz'),
  ('Lomos la Catedral - General Paz',           'censurado-general-paz',   'lomos-la-catedral', 'normal', 'Lomos la Catedral · General Paz'),
  ('Lomos la Catedral - General Paz - Turbo',   'censurado-general-paz',   'lomos-la-catedral', 'turbo',  'Lomos la Catedral · General Paz · Turbo'),
  ('Lomos la Catedral - Nueva Córdoba',         'censurado-nueva-cordoba', 'lomos-la-catedral', 'normal', 'Lomos la Catedral · Nueva Córdoba'),
  ('Lomos la Catedral - Nueva Córdoba - Turbo', 'censurado-nueva-cordoba', 'lomos-la-catedral', 'turbo',  'Lomos la Catedral · Nueva Córdoba · Turbo'),
  ('Lomos la Catedral - Recta',                 'censurado-recta',         'lomos-la-catedral', 'normal', 'Lomos la Catedral · Recta'),
  ('Lomos la Catedral - Urca',                  'censurado-urca',          'lomos-la-catedral', 'normal', 'Lomos la Catedral · Urca')
)
insert into public.delivery_points (location_id, sub_brand_id, channel, formato, sheet_label, name)
select l.id, sb.id, 'rappi', d.formato, d.sheet_label, d.name
from datos d
join public.locations l on l.slug = d.local_slug
left join public.sub_brands sb on sb.slug = d.sub_marca
on conflict (channel, sheet_label) do nothing;
