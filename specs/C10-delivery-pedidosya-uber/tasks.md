# Tasks — C10 · Delivery de PedidosYa y Uber

- [x] T1 — Migración del esquema: `delivery_metric_defs` + `delivery_metric_values`, con RLS y
      la misma policy que el resto.
- [x] T2 — Sembrar el catálogo: 13 indicadores de Rappi, 14 de Uber, 9 de PedidosYa, con
      nombre, unidad, `mejor_si_baja`, `destacado`, `orden` y el encabezado exacto de cada
      planilla.
- [x] T3 — Migrar los 43 registros de Rappi de `delivery_metrics` a valores, verificar el
      conteo en SQL y recién ahí `drop table delivery_metrics`.
- [x] T4 — Sembrar los puntos de venta que faltan y sus etiquetas: 8 de Uber (incluidas las 3
      de Lomos la Catedral que operan sin pedidos) y 16 de PedidosYa (Woops entra acá).
- [x] T5 — `parseIndicadores`: busca cada indicador por su encabezado, normaliza según
      la unidad, saltea las filas sin período en silencio y descarta con aviso las que tienen
      período y un punto de venta desconocido.
- [x] T6 — Las tres entradas de `CANALES_DELIVERY` con su estrategia de período, y el sync
      recorriéndolas con un try/catch por canal.
- [x] T7 — Ensayo en seco (`npm run ensayo-sync`) contra las tres planillas vivas: tiene que
      dar 43 + 13 + 32 filas leídas, cero descartes por punto sin identificar.
- [x] T8 — Consultas en `data.ts`: catálogo por canal, valores por punto y período, resumen
      armado sobre los indicadores destacados.
- [x] T9 — Pantalla: `FiltroCanal`, tarjetas y tabla armadas desde el catálogo, motivos solo en
      Rappi, y la nota de la cuenta adaptada a cada canal (Rappi y PedidosYa no traen volumen
      de pedidos; Uber sí).
- [x] T10 — Corrida real de `/api/sync` contra la base y verificación de que correr dos veces
      no cambia los conteos.
- [x] T11 — Actualizar `features.json`, `progress/CURRENT.md`, `HISTORY.md` y `MAPA-DE-FUENTES.md`
      (las dos planillas nuevas y sus columnas).

## Verificación (la corre el REVISOR)

- [x] `bash init.sh` pasa
- [x] `npm run typecheck` pasa
- [x] `npm run ensayo-sync` da los conteos esperados y cero puntos sin identificar
- [x] Las tres pantallas de canal renderizan con datos reales, en los dos meses
- [x] **CA-11**: los números de Rappi de agosto son idénticos a los de antes de la migración
- [x] Correr el sync dos veces seguidas no cambia los conteos de la base
- [x] Cada criterio de aceptación de `requirements.md` cumplido
