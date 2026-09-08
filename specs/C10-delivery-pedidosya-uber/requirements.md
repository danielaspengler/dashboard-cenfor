# Requirements — C10 · Delivery de PedidosYa y Uber

## Problema / objetivo

La sección Delivery muestra solo Rappi. Faltan los otros dos canales por los que vende
Censurado. Cada app publica indicadores distintos, así que no alcanza con "sumar dos
planillas más": hay que cambiar cómo se guardan los indicadores para que agregar un canal
no sea rehacer el esquema.

## Lo que dicen las planillas (relevado el 08/09/2026)

| | Rappi | Uber | PedidosYa |
|---|---|---|---|
| Pestaña | 3 (`Rappi_Publicado` + 2 de motivos) | 1 (`Hoja 1`) | 1 (`Metricas_unificadas_CENFOR`) |
| Filas con datos | 43 | 13 | 32 |
| Puntos de venta | 22 | 8 | 16 |
| Períodos | julio y agosto 2026 | julio y agosto 2026 | julio y agosto 2026 |
| Cómo viene el período | dos columnas: inicio y fin | una: `07/2026` | una: `2026-07` |
| Indicadores | 13 | 14 | 9 |
| Volumen de pedidos | **no trae** | Pedidos completados | **no trae** |
| Cantidad de evaluaciones | Cantidad de reseñas | **no trae** | N evaluaciones |
| Motivos de reclamo | sí, desagregados | solo "top artículo incorrecto" | no |

**Woops aparece por primera vez** (5 puntos en PedidosYa): vende por PedidosYa y Uber, no por
Rappi. En Uber hay tres tiendas de Lomos la Catedral cargadas sin datos en julio ni agosto:
Daniela confirmó el 08/09/2026 que **operan**, así que se siembran igual.

Las unidades se resolvieron leyendo los valores **formateados** de cada planilla, porque sin
formato son todas fracciones indistinguibles: en Uber `0,00102` es `0:01:28` (una duración) y
en PedidosYa `0,4493` es `44,9%` (un porcentaje). El mismo nombre de columna —"Tiempo de
espera evitable"— significa cosas distintas en las dos apps.

## Criterios de aceptación

- **CA-1** — Cuando el sync corre, los indicadores de los tres canales quedan guardados como
  valores con su definición (canal, clave, nombre, unidad), no como columnas de una tabla.
- **CA-2** — Cuando el sync procesa una planilla, encuentra cada indicador **por el encabezado
  declarado en el catálogo**, no por posición: insertar una columna no puede cambiar qué se lee.
- **CA-3** — Cuando una fila no tiene período —las 176 filas de plantilla de PedidosYa y las 3
  tiendas sin datos de Uber— se ignora **sin contarla como descarte**. Un descarte es un aviso
  de que algo se rompió; 179 avisos por diseño hacen que nadie mire la lista.
- **CA-4** — Cuando una fila trae un punto de venta que no está en `delivery_point_labels` de
  ese canal, se descarta informando el texto exacto que no matcheó.
- **CA-5** — Cuando el sync corre dos veces seguidas, los conteos de la base no cambian
  (dedup por punto + indicador + período).
- **CA-6** — Cuando una duración viene como fracción de día (`0:28:00`), se guarda en minutos;
  cuando un porcentaje viene como fracción (`0,0219`), se guarda en escala 0–100. La pantalla
  no tiene que saber de dónde salió cada número.
- **CA-7** — Cuando el valor es `-` o está vacío, se guarda como sin dato, no como cero.
  "Woops Nueva Córdoba" tiene `-` en Score con 0 evaluaciones: es una tienda sin actividad.
- **CA-8** — La sección Delivery tiene un filtro de canal —Rappi · PedidosYa · Uber— que vive
  en la URL, y cada canal muestra **sus** indicadores con **sus** nombres. No hay vista
  combinada: los tres no miden lo mismo.
- **CA-9** — El filtro de mes sigue funcionando dentro de cada canal, y los meses que ofrece
  son los que ese canal tiene cargados.
- **CA-10** — Los motivos de reclamo se muestran solo en Rappi, que es el único que los trae.
  En los otros dos la sección no aparece vacía: no aparece.
- **CA-11** — Después de migrar, los números de Rappi en pantalla son **idénticos** a los de
  antes de la migración (agosto: 4,12★ / 175 reseñas · 4,8% reclamos · 0,4% cancelaciones ·
  30,5% demora · 87,5% disponibilidad · $226.330).

## Fuera de scope

- Una vista que compare los tres canales entre sí. Se evaluó y se descartó (ver `design.md`).
- Umbrales / semáforos: el cliente no los definió para ningún canal.
- Motivos de reclamo de Uber y PedidosYa: no los publican.
- Tarjeta de delivery en el Resumen.

## Datos / seguridad

- Lee: las dos planillas nuevas, con la misma cuenta de servicio de solo lectura.
- Escribe: `delivery_metric_defs`, `delivery_metric_values`, `delivery_points`,
  `delivery_point_labels`. Todas con RLS y la misma policy que el resto del tablero.
- El sync sigue detrás del `CRON_SECRET`. Sin cambios de permisos.

## Preguntas abiertas

- Ninguna bloqueante. Queda anotado para el cliente que **"Tiempo de espera evitable" no
  significa lo mismo en Uber que en PedidosYa**, y que ninguna de las dos definió umbrales.
