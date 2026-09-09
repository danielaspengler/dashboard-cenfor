-- Los reclamos entran al eje operativo del score, y queda declarado el rol
-- de los pedidos rechazados para cuando ese dato exista.
--
-- Decidido con Daniela el 09/09/2026: el operativo resta pedidos rechazados
-- (si la app lo publica), cancelados, tiempo cerrado y pedidos con reclamos.
--
-- Por qué importa que los reclamos entren: en agosto las cancelaciones dieron
-- 0,14% en Rappi y 0,00% en PedidosYa, mientras los reclamos dieron 3,12% y
-- 1,69%. Un eje que solo restaba cancelaciones casi no distinguía un local de
-- otro; el número que se mueve es el de reclamos.
--
-- NINGUNA de las tres planillas publica hoy "pedidos rechazados": Rappi trae
-- cancelaciones, PedidosYa cancelación evitable y Uber pedidos no completados,
-- un concepto por app. El rol queda definido igual, sin indicador asignado: el
-- día que la métrica aparezca en una planilla, entra al score marcando una
-- fila, sin tocar el cálculo.

update public.delivery_metric_defs set rol = 'reclamos'
  where channel = 'rappi' and clave = 'reclamos_pct';
update public.delivery_metric_defs set rol = 'reclamos'
  where channel = 'pedidos_ya' and clave = 'pedidos_con_reclamos_pct';

-- Uber no habla de "reclamos" sino de pedidos con errores: es su nombre para
-- el pedido que llegó mal y el cliente reportó.
update public.delivery_metric_defs set rol = 'reclamos'
  where channel = 'uber' and clave = 'pedidos_con_errores_pct';

comment on column public.delivery_metric_defs.rol is
  'Papel del indicador en el score de calidad: calificacion, reclamos, cancelados, '
  'rechazados, disponibilidad, tiempo_cerrado, pedidos_completados, '
  'pedidos_no_completados. Null = el indicador se muestra en la pantalla pero no '
  'entra en ningun calculo. "rechazados" no tiene indicador asignado todavia: '
  'ninguna de las tres apps lo publica en sus planillas.';
