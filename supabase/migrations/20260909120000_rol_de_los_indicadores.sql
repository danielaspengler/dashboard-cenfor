-- Qué papel cumple cada indicador en el score de calidad.
--
-- El score de un local necesita saber, de cada app, cuál es su porcentaje de
-- cancelados, cuál su calificación y cuánto estuvo cerrada. Las tres apps lo
-- publican con nombres propios —"Cancelaciones" en Rappi, "Cancelación
-- evitable" en PedidosYa— y ninguna usa la palabra "rechazados" de la fórmula.
--
-- Esa equivalencia va acá y no en el código, por el mismo motivo por el que
-- los indicadores dejaron de ser columnas: sumar una app o cambiar de opinión
-- sobre qué indicador cuenta tiene que ser una fila en una tabla.
--
-- Ojo con dos roles que NO son intercambiables:
--   · `disponibilidad`  es un porcentaje donde MÁS es mejor (Rappi, Uber).
--   · `tiempo_cerrado`  son minutos donde MENOS es mejor (PedidosYa).
-- El que consume esto tiene que invertir el primero antes de compararlos.

alter table public.delivery_metric_defs
  add column if not exists rol text;

comment on column public.delivery_metric_defs.rol is
  'Papel del indicador en el score de calidad: calificacion, cancelados, '
  'disponibilidad, tiempo_cerrado, pedidos_completados, pedidos_no_completados. '
  'Null = el indicador se muestra en la pantalla pero no entra en ningún cálculo.';

-- Rappi
update public.delivery_metric_defs set rol = 'calificacion'
  where channel = 'rappi' and clave = 'calificacion_promedio';
update public.delivery_metric_defs set rol = 'cancelados'
  where channel = 'rappi' and clave = 'cancelaciones_pct';
update public.delivery_metric_defs set rol = 'disponibilidad'
  where channel = 'rappi' and clave = 'disponibilidad_pct';

-- PedidosYa. Su "hora no disponible" es el concepto invertido de la
-- disponibilidad de Rappi, y viene en minutos: por eso lleva otro rol.
update public.delivery_metric_defs set rol = 'calificacion'
  where channel = 'pedidos_ya' and clave = 'score';
update public.delivery_metric_defs set rol = 'cancelados'
  where channel = 'pedidos_ya' and clave = 'cancelacion_evitable_pct';
update public.delivery_metric_defs set rol = 'tiempo_cerrado'
  where channel = 'pedidos_ya' and clave = 'hora_no_disponible';

-- Uber no publica un porcentaje de cancelados: publica cuántos pedidos
-- completó y cuántos no. El porcentaje se deriva de esos dos.
update public.delivery_metric_defs set rol = 'calificacion'
  where channel = 'uber' and clave = 'score';
update public.delivery_metric_defs set rol = 'disponibilidad'
  where channel = 'uber' and clave = 'tiempo_en_linea';
update public.delivery_metric_defs set rol = 'pedidos_completados'
  where channel = 'uber' and clave = 'pedidos_completados';
update public.delivery_metric_defs set rol = 'pedidos_no_completados'
  where channel = 'uber' and clave = 'pedidos_no_completados';
