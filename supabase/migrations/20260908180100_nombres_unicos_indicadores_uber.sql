-- Uber publica el porcentaje y la cantidad de lo mismo, y las dos columnas
-- quedaban con el mismo título en la tabla de la pantalla. Se distinguen por
-- el nombre, como ya pasa en Rappi con "Reclamos" y "Órdenes con reclamos".
update public.delivery_metric_defs set nombre = 'Cantidad con errores'
  where channel = 'uber' and clave = 'pedidos_con_errores';
update public.delivery_metric_defs set nombre = 'Cantidad con contracargo'
  where channel = 'uber' and clave = 'pedidos_contracargo';
