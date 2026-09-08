-- La tabla vieja de indicadores de Rappi, una vez verificada la copia.
--
-- Se comparó antes de borrar, sobre agosto de 2026 y los puntos activos, el
-- agregado calculado con las columnas contra el calculado con el catálogo:
--
--   reclamos 4,8150 · cancelaciones 0,3905 · demora 32,0055 ·
--   disponibilidad 91,9240 · calificación 4,1200 · 175 reseñas ·
--   $226.330 compensados
--
-- Los siete dieron idénticos hasta el cuarto decimal, y los 517 valores no
-- nulos de las 43 filas quedaron como 517 valores. Recién con eso a la vista
-- se borra.
--
-- Dos modelos para el mismo dato terminan en dos verdades distintas, así que
-- no se deja "por las dudas". Y el respaldo real no es esta tabla: es la
-- planilla de Rappi, desde donde el sync reconstruye todo en 6 segundos.

drop table public.delivery_metrics;
