-- Semilla: las dos marcas, las áreas del panel y los 10 locales con
-- sus llaves de matcheo. Confirmado con Daniela el 02/09/2026.
-- Fuente de verdad documentada en HOLT/CENFOR/proyecto-dashboard/LOCALES.md

insert into public.brands (slug, name) values
  ('censurado', 'Censurado'),
  ('formaggio', 'Formaggio');

insert into public.areas (slug, name) values
  ('operaciones',   'Operaciones'),
  ('marketing',     'Marketing'),
  ('administracion','Administración');

insert into public.locations
  (brand_id, slug, name, city, google_place_id, ms_form_label, audit_sheet_label)
values
  ((select id from public.brands where slug='censurado'),
   'censurado-recta', 'Recta', 'Córdoba',
   'ChIJsydZIZufMpQR15UFXpetqr0', 'Recta', 'Recta'),

  ((select id from public.brands where slug='censurado'),
   'censurado-carlos-paz', 'Carlos Paz', 'Villa Carlos Paz',
   'ChIJNRr3ox9nLZQRNU3Neh4PaYA', 'Carlos Paz', 'Carlos Paz'),

  ((select id from public.brands where slug='censurado'),
   'censurado-general-paz', 'General Paz', 'Córdoba',
   'ChIJ-VIhviCjMpQRdsd1qDkDq_M', 'General Paz', 'GENERAL PAZ'),

  ((select id from public.brands where slug='censurado'),
   'censurado-urca', 'Urca', 'Córdoba',
   'ChIJa2cWiXmZMpQRcItMChl0WEs', 'Urca', 'URCA'),

  ((select id from public.brands where slug='censurado'),
   'censurado-poeta-lugones', 'Poeta Lugones', 'Córdoba',
   'ChIJhyvxXv-ZMpQRxWijKRAWC_c', null, null),

  -- Luuma todavía no tiene ficha de Google en la planilla de scraping:
  -- aparece con auditoría y sin reseñas, no con un cero.
  ((select id from public.brands where slug='censurado'),
   'censurado-luuma', 'Luuma', 'Córdoba',
   null, null, 'Luuma'),

  ((select id from public.brands where slug='censurado'),
   'censurado-nueva-cordoba', 'Nueva Córdoba', 'Córdoba',
   'ChIJBckoomijMpQRzLCSWoM5XcQ', 'Nueva Córdoba', 'Nueva Cordoba'),

  ((select id from public.brands where slug='formaggio'),
   'formaggio-tejeda', 'Tejeda', 'Córdoba',
   'ChIJU-UsAJ2ZMpQRK_lndZC8jOQ', 'Tejeda', null),

  ((select id from public.brands where slug='formaggio'),
   'formaggio-villa-allende', 'Villa Allende', 'Villa Allende',
   'ChIJy2X1ByqdMpQRY3o942jJi3o', 'Villa Allende', null),

  -- Ojo: Formaggio lo escribe SIN acento y Censurado CON acento.
  -- Por eso el texto se compara siempre dentro de la marca.
  ((select id from public.brands where slug='formaggio'),
   'formaggio-nueva-cordoba', 'Nueva Córdoba', 'Córdoba',
   'ChIJE1hOo9ijMpQRcAZkNHay_CI', 'Nueva Cordoba', null);
