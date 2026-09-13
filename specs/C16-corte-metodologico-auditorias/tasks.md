# Tasks — C16 · Corte metodológico en auditorías presenciales

> El LÍDER las escribe; el IMPLEMENTADOR las marca `[x]` a medida que avanza.
> (test) = se escribe la prueba primero y tiene que fallar antes del cambio.
> 🔒 = bloqueada por la respuesta del cliente sobre los umbrales (P1 de `requirements.md`).
>
> **Antes de arrancar:** P3 tiene que estar respondida (¿el corte es el 01/08/2026 exacto, sin
> período de transición?). Si hubo transición, la escala no se puede deducir de la fecha y la spec
> vuelve al líder.

## Qué se puede hacer ya y qué no

**Se puede implementar todo menos una línea.** Trece de las catorce tareas no dependen de la
respuesta del cliente: la constante, el promedio que no cruza, los avisos, la columna de la tabla,
el gráfico con el corte, el Resumen, el informe y el score. Mientras P1 esté abierta, las
auditorías de la escala nueva se muestran sin color y sin clasificación, con la leyenda que lo
dice (T5 y T7).

**Bloqueado:** T13, que es darle valor a `NIVELES_AUDITORIA_NUEVA`. Una línea en `marca.ts` y los
textos provisorios de T7 y T10 que se sacan cuando el criterio exista.

## Base: constante, escala y promedio

- [ ] **T1 (test)** — `scripts/probar-auditorias.ts`, **sin base**, con filas fijas: las 6
      auditorías de agosto 2026 (General Paz 67,2 · Recta 72,6 · Nueva Córdoba 75,2 · Urca 75,6 ·
      Luuma 85,0 · Carlos Paz 86,0), una muestra del tramo anterior que promedie 89,4 en 110
      visitas y julio 2026 en 86,4. Asserts: `escalaAuditoria("2026-07-31")` es `anterior`,
      `("2026-08-01")` es `nueva`, `("")` es `desconocida`; `promedioAuditorias()` del conjunto
      completo devuelve `tipo: "mixto"` con 76,9 / 6 y 89,4 / 110; solo agosto devuelve `unico`
      escala `nueva`; lista vacía devuelve `sin_dato`; una fila sin fecha o sin `score_pct` no
      entra a ningún tramo. Correr `npx tsx scripts/probar-auditorias.ts`.
      **Hecho:** el script existe y **falla** porque las funciones no existen todavía.
- [ ] **T2** — `marca.ts`: `CORTE_AUDITORIAS`, `MES_CORTE`, `escalaAuditoria()`,
      `NIVELES_AUDITORIA_NUEVA = null` y `nivelAuditoria(pct, fecha?)` que elige la lista según la
      escala. `NIVELES_AUDITORIA` no se toca. Comentario al lado de la constante con el porqué del
      corte y la fecha del dato (Daniela, 11/09/2026).
      **Hecho:** `npm run typecheck` pasa; los llamados existentes de `nivelAuditoria()` siguen
      compilando sin pasar fecha.
- [ ] **T3** — `src/lib/auditorias.ts`: `promedioAuditorias()` y `serieAuditorias()`, con los
      tipos de `design.md`. Sin más import que `marca.ts`.
      **Hecho:** T1 pasa y sale con código 0; `npm run typecheck` pasa.
- [ ] **T4 (test)** — Sumar a T1 los asserts de `serieAuditorias()`: devuelve un valor por mes con
      auditorías, ordenado del más viejo al más nuevo, con `null` en los meses intermedios sin
      auditorías, y agosto 2026 en 76,9. **Hecho:** T1 vuelve a pasar con los asserts nuevos.

## Componentes compartidos

- [ ] **T5** — `ui.tsx`: `Puntaje` recibe `fecha?: string | null` y separa «no hay valor» de «no
      hay semáforo»: con valor y sin nivel, muestra el número en el color de texto normal.
      **Hecho:** typecheck pasa; una visita de mystery shopper y una auditoría anterior al corte se
      ven **exactamente igual** que antes (mismo color, mismo formato); una auditoría de agosto
      2026 muestra el número sin color.
- [ ] **T6** — `graficos.tsx`: prop opcional `corte` en `GraficoLinea` (línea vertical punteada en
      el borde de la columna del mes, tramo nuevo punteado, dos etiquetas, nada si el corte cae
      fuera de la serie o en un extremo). `GraficoBarras` no se toca.
      **Hecho:** typecheck pasa; `/administracion/resumen` se ve igual que antes (no pasa `corte`);
      `grep -nE "#[0-9a-fA-F]{3,6}\b" src/components/graficos.tsx` sigue sin mostrar ningún color
      escrito a mano.

## Pantallas

- [ ] **T7** — `ms-auditorias/page.tsx`: bajada nueva (CA-13), detalle de la tarjeta con el reparto
      por planilla (CA-7), aviso en la bajada de la sección de auditorías (CA-14) con la leyenda
      provisoria de los cortes de color, y columna «Planilla» en la tabla con el `Puntaje`
      recibiendo la fecha de cada fila.
      **Hecho:** con la base de hoy la tabla muestra «nueva» en las 6 filas, los puntajes sin color,
      y los textos nombran «agosto 2026» sin que ese texto esté escrito en el archivo.
- [ ] **T8** — `ms-auditorias/page.tsx`: sección «Evolución del puntaje de auditoría» con
      `GraficoLinea`, `serieAuditorias()` sobre **todas** las auditorías (sin el filtro de mes),
      `marcado` = el mes del filtro, `corte` con `MES_CORTE` y las dos etiquetas. Con menos de dos
      meses, `SinDato` en vez del gráfico.
      **Hecho:** con la base de hoy la sección dice «sin dato»; con las filas fijas de T1 cargadas
      en un render de prueba (o cuando entre el histórico) se ve la línea vertical punteada entre
      julio y agosto 2026, el tramo nuevo punteado y las dos etiquetas.
- [ ] **T9** — `resumen/page.tsx`: el promedio inline pasa a `promedioAuditorias()`; la tarjeta
      resuelve los tres casos (`unico`, `mixto`, `sin_dato`); la columna «Última auditoría» pasa la
      fecha al `Puntaje`; la línea de pie suma el aviso cuando hay auditorías de los dos lados.
      **Hecho:** con «Todo» y la base de hoy, Censurado muestra un promedio único de la escala
      nueva y Formaggio sigue diciendo «no aplica»; ningún número del Resumen cambia respecto de
      hoy salvo los textos.
- [ ] **T10** — `informe/page.tsx`: aviso del corte en la bajada del bloque «Resumen de auditoría»
      cuando el mes es de la escala nueva (CA-15), y la leyenda provisoria de los cortes de color.
      Un mes de la escala anterior no cambia su texto.
      **Hecho:** `/operaciones/informe?local=censurado-carlos-paz&mes=2026-08` muestra el aviso y el
      puntaje sin clasificación al lado; el bloque no queda con un hueco donde iba el nombre del
      nivel.
- [ ] **T11** — `score.ts`: el `detalle` del eje Auditoría dice con qué planilla se midió. **El
      cálculo no cambia.**
      **Hecho:** `npx tsx scripts/probar-score.ts 2026-08` da **los mismos números que antes** del
      cambio (se comparan las dos salidas); el detalle del eje dice «planilla nueva».

## Cierre

- [ ] **T12** — Higiene: `grep -rn "2026-08" src/` no muestra ningún literal de fecha de corte
      fuera de `marca.ts`; archivos ≤ 500 líneas y funciones ≤ 50 (`ms-auditorias/page.tsx` es el
      que más crece); sin `any`, sin `TODO`. `npm run typecheck` pasa.
- [ ] 🔒 **T13** — **Bloqueada por P1.** Cuando el cliente confirme los umbrales de la planilla
      nueva: darle valor a `NIVELES_AUDITORIA_NUEVA` en `marca.ts` y sacar las dos leyendas
      provisorias («están a confirmar con el cliente») de T7 y T10.
      **Hecho:** las auditorías de agosto 2026 vuelven a tener color y clasificación; ninguna
      pantalla se tocó salvo esas dos leyendas.
- [ ] **T14** — `features.json` (C16 a `done` o a `in_progress` si T13 sigue abierta, y la nota de
      umbrales de auditoría en `_esperando_definicion_de_daniela`), `progress/CURRENT.md` y una
      línea en `progress/HISTORY.md`. P2 (¿se carga el histórico de auditorías?) pasa a Pendientes
      de `CURRENT.md`.

## Verificación (la corre el REVISOR)

Entorno:

- [ ] `bash init.sh` pasa.
- [ ] `npm run typecheck` pasa.
- [ ] `npx tsx scripts/probar-auditorias.ts` sale con código 0, con los números de CA-24.
- [ ] `npx tsx scripts/probar-score.ts 2026-08` da los mismos números que antes de C16.
- [ ] `npm run build` pasa.
- [ ] Levantar **sin tocar el dev server de Daniela en el 3100** (Next se planta si ya hay uno):
      bash `MODO_DEMO=1 npx next start -p 3101` · PowerShell
      `$env:MODO_DEMO='1'; npx next start -p 3101`. Si el 3101 está ocupado por un `next start`
      viejo, levantar en otro puerto y cerrar solo ese.

Primero, el dato de partida (define qué se puede ver en el navegador):

```sql
select date_trunc('month', audit_date) as mes, count(*), round(avg(score_pct)::numeric, 1)
from audits group by 1 order by 1;
```

- [ ] Anotar el resultado. Si todas las filas son de agosto 2026, el caso mixto **no se puede ver
      en pantalla** y se verifica con el script. Decirlo, no disfrazarlo.

Navegador, en `http://localhost:3101`:

- [ ] **MS y Auditorías**: la bajada dice que desde agosto 2026 la planilla es más exigente y que
      los puntajes anteriores no se comparan con los nuevos.
- [ ] La sección «Auditorías presenciales» lleva el aviso del corte y la leyenda de los cortes de
      color a confirmar (mientras T13 esté abierta).
- [ ] La tabla tiene la columna «Planilla»; las 6 auditorías de agosto dicen «nueva» y muestran el
      puntaje **sin color y sin clasificación**, con el número completo.
- [ ] La tarjeta «Auditorías» declara con qué planilla se midieron las que cuenta.
- [ ] La sección de evolución: con un solo mes dice «sin dato», no dibuja un punto con ejes.
- [ ] **Resumen de Operaciones** con «Todo»: la tarjeta de auditorías de Censurado no muestra un
      número que mezcle escalas. Con el histórico cargado, muestra los dos promedios por separado.
- [ ] **Informe por local**, Carlos Paz agosto 2026: el bloque de auditoría avisa del corte; el
      score sigue dando **87,17** como antes de C16 y el eje Auditoría dice «planilla nueva».
- [ ] Mystery shopper sigue exactamente igual: mismos colores, mismos cortes, mismos promedios. Su
      planilla no cambió.
- [ ] Delivery, Reseñas y Resumen administrativo se ven igual que antes (T6 no los toca).
- [ ] Tono: rayas (—) visibles ≤ 1 por pantalla, los vacíos dicen «sin dato», nada de «no es X, es
      Y», frases cortas con el dato adelante.
- [ ] Cada criterio de `requirements.md` cumplido o marcado como no verificado, con el motivo.

Con el histórico cargado (solo si P2 se resuelve y las filas entran):

- [ ] El gráfico muestra la línea vertical punteada entre julio y agosto 2026, el tramo nuevo
      punteado y las dos etiquetas.
- [ ] Los promedios cruzados contra la planilla del Looker (`Agrupado Looker - Censurado.xlsx`,
      hoja `Puntaje auditorias`): 110 visitas a 89,4% hasta julio, 6 a 76,9% en agosto.
