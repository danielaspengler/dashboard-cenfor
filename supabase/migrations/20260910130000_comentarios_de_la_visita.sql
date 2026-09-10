-- Los comentarios que escribe el mystery shopper en su visita.
--
-- El informe que se le entrega a cada local los muestra —«lo mejor de la
-- visita» y «qué cambiaría»— y son la única parte del documento escrita por
-- una persona que estuvo ahí. Sin ellos el informe es todo números.
--
-- Viven en la hoja de RESPUESTAS del formulario, no en la de puntajes que el
-- sync venía leyendo. Se unen por la marca temporal, que es la misma llave con
-- la que se deduplica cada visita.
--
-- Censurado tiene las tres columnas dos veces —una por bloque, take away y
-- delivery— porque su formulario se ramifica; Formaggio una sola vez. El
-- parser se queda con el bloque que tenga texto.

alter table public.mystery_shopper_visits
  add column if not exists observaciones text,
  add column if not exists lo_mejor      text,
  add column if not exists a_mejorar     text;

comment on column public.mystery_shopper_visits.observaciones is
  'Observaciones del pedido y el empaquetado, tal como las escribio el mystery shopper.';
comment on column public.mystery_shopper_visits.lo_mejor is
  'Lo mejor de la experiencia, en palabras del mystery shopper.';
comment on column public.mystery_shopper_visits.a_mejorar is
  'Que cambiaria para mejorar la experiencia.';
