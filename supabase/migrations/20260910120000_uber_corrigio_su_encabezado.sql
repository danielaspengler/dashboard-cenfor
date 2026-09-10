-- Uber: la planilla corrigió el typo de su encabezado.
--
-- La columna se llamaba "% pedidos con erroress" —con doble s— y ahora se
-- llama "% pedidos con errores". Desde ese cambio el sync venía descartando el
-- indicador y avisándolo en cada corrida: "columna del catálogo que no está en
-- la planilla".
--
-- Es exactamente el caso para el que se diseñó ese aviso, y vale la pena
-- dejarlo escrito: el parser NO adivina. Si un encabezado cambia, la columna se
-- descarta y se informa, en vez de guardar un cero que después nadie sabe de
-- dónde salió. El indicador además es el que el score usa como reclamos de
-- Uber, así que un cero silencioso habría inflado el eje operativo de todos los
-- locales que venden por esa app.

update public.delivery_metric_defs
   set sheet_header = '% pedidos con errores'
 where channel = 'uber' and clave = 'pedidos_con_errores_pct';
