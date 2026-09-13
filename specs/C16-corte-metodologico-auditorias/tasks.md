# Tasks — C16 · Corte metodológico en auditorías presenciales

> El LÍDER las escribe; el IMPLEMENTADOR las marca `[x]` a medida que avanza.
> (test) = se escribe la prueba primero y tiene que fallar antes del cambio.
>
> **Las tres preguntas abiertas quedaron resueltas el 13/09/2026** (ver `requirements.md` →
> «Preguntas resueltas»). P3: el corte es el 01/08/2026 y alcanza con la fecha. P1: la escala nueva
> tiene un solo corte, 85. P2: el histórico se carga, pero como feature aparte.

## Qué se puede hacer ya y qué no

**Se implementan las catorce tareas.** Ninguna quedó bloqueada: P1 llegó con el criterio de HOLT
—un corte en 85, cumple o no cumple—, así que T13 entra con el resto y **las dos leyendas
provisorias de T7 y T10 no se escriben nunca**.

**Lo que no se puede hacer es verlo funcionar con datos de los dos lados** (P2): la base tiene 6
auditorías y todas son de agosto 2026. El caso mixto y el gráfico con la línea del corte se
verifican con las filas fijas de T1, no en el navegador. Eso se dice en el reporte, no se disfraza.

## Base: constante, escala y promedio

- [x] **T1 (test)** — `scripts/probar-auditorias.ts`, **sin base**, con filas fijas: las 6
      auditorías de agosto 2026 tal como están en la base (General Paz 67,17 · Recta 72,57 · Nueva
      Córdoba 75,23 · Urca 75,56 · Luuma 85,46 · Carlos Paz 86,04), una muestra del tramo anterior
      que promedie 89,4 en 110 visitas y julio 2026 en 86,4. Asserts:
      `escalaAuditoria("2026-07-31")` es `anterior`, `("2026-08-01")` es `nueva`, `("")` es
      `desconocida`; `promedioAuditorias()` del conjunto completo devuelve `tipo: "mixto"` con
      77,0 / 6 y 89,4 / 110; solo agosto devuelve `unico` escala `nueva`; lista vacía devuelve
      `sin_dato`; una fila sin fecha o sin `score_pct` no entra a ningún tramo. Correr
      `npx tsx scripts/probar-auditorias.ts`.
      **Hecho:** el script existe y **falla** porque las funciones no existen todavía.
- [x] **T2** — `marca.ts`: `CORTE_AUDITORIAS`, `MES_CORTE`, `escalaAuditoria()`,
      `NIVELES_AUDITORIA_NUEVA` con el corte único de 85 (P1) y `nivelAuditoria(pct, fecha?)` que
      elige la lista según la escala. `NIVELES_AUDITORIA` no se toca. Comentario al lado de la
      constante con el porqué del corte y la fecha del dato (Daniela, 13/09/2026).
      **Hecho:** `npm run typecheck` pasa; los llamados existentes de `nivelAuditoria()` siguen
      compilando sin pasar fecha.
- [x] **T3** — `src/lib/auditorias.ts`: `promedioAuditorias()` y `serieAuditorias()`, con los
      tipos de `design.md`. Sin más import que `marca.ts`.
      **Hecho:** T1 pasa y sale con código 0; `npm run typecheck` pasa.
- [x] **T4 (test)** — Sumar a T1 los asserts de `serieAuditorias()`: devuelve un valor por mes con
      auditorías, ordenado del más viejo al más nuevo, con `null` en los meses intermedios sin
      auditorías, y agosto 2026 en 77,005. **Hecho:** T1 vuelve a pasar con los asserts nuevos.
      Los asserts de `serieAuditorias()` viven en el mismo `probar-auditorias.ts` de T1, no en un
      archivo aparte: es una sola prueba con cuatro bloques.

## Componentes compartidos

- [x] **T5** — `ui.tsx`: `Puntaje` recibe `fecha?: string | null` y separa «no hay valor» de «no
      hay semáforo»: con valor y sin nivel, muestra el número en el color de texto normal.
      **Hecho:** typecheck pasa; una visita de mystery shopper y una auditoría anterior al corte se
      ven **exactamente igual** que antes (mismo color, mismo formato); una auditoría sin fecha
      legible muestra el número sin color en vez de esconderlo.
- [x] **T6** — `graficos.tsx`: prop opcional `corte` en `GraficoLinea` (línea vertical punteada en
      el borde de la columna del mes, tramo nuevo punteado, dos etiquetas, nada si el corte cae
      fuera de la serie o en un extremo). `GraficoBarras` no se toca.
      **Hecho:** typecheck pasa; `/administracion/resumen` se ve igual que antes (no pasa `corte`);
      `grep -nE "#[0-9a-fA-F]{3,6}\b" src/components/graficos.tsx` sigue sin mostrar ningún color
      escrito a mano.

## Pantallas

- [x] **T7** — `ms-auditorias/page.tsx`: bajada nueva (CA-13), detalle de la tarjeta con el reparto
      por planilla (CA-7), aviso en la bajada de la sección de auditorías (CA-14) con el corte de
      85 y los cinco cortes de la planilla vieja, y columna «Planilla» en la tabla con el `Puntaje`
      recibiendo la fecha de cada fila.
      **Hecho:** con la base de hoy la tabla muestra «nueva» en las 6 filas, Carlos Paz y Luuma en
      verde y los otros cuatro en rojo, y los textos nombran «agosto 2026» sin que ese texto esté
      escrito en el archivo.
- [x] **T8** — `ms-auditorias/page.tsx`: sección «Evolución del puntaje de auditoría» con
      `GraficoLinea`, `serieAuditorias()` sobre **todas** las auditorías (sin el filtro de mes),
      `marcado` = el mes del filtro, `corte` con `MES_CORTE` y las dos etiquetas. Con menos de dos
      meses, `SinDato` en vez del gráfico.
      **Hecho:** con la base de hoy la sección dice «sin dato»; con las filas fijas de T1 cargadas
      en un render de prueba (o cuando entre el histórico) se ve la línea vertical punteada entre
      julio y agosto 2026, el tramo nuevo punteado y las dos etiquetas.
- [x] **T9** — `resumen/page.tsx`: el promedio inline pasa a `promedioAuditorias()`; la tarjeta
      resuelve los tres casos (`unico`, `mixto`, `sin_dato`); la columna «Última auditoría» pasa la
      fecha al `Puntaje`; la línea de pie suma el aviso cuando hay auditorías de los dos lados.
      **Hecho:** con «Todo» y la base de hoy, Censurado muestra un promedio único de la escala
      nueva y Formaggio sigue diciendo «no aplica»; ningún número del Resumen cambia respecto de
      hoy salvo los textos.
- [x] **T10** — `informe/page.tsx`: aviso del corte en la bajada del bloque «Resumen de auditoría»
      cuando el mes es de la escala nueva (CA-15), con el corte de 85 en lugar de los cinco cortes
      viejos. Un mes de la escala anterior no cambia su texto.
      **Hecho:** `/operaciones/informe?local=censurado-carlos-paz&mes=2026-08` muestra el aviso y el
      puntaje con su clasificación de la escala nueva («Cumple»), no con la de la planilla vieja.
- [x] **T11** — `score.ts`: el `detalle` del eje Auditoría dice con qué planilla se midió. **El
      cálculo no cambia.**
      **Hecho:** `npx tsx scripts/probar-score.ts 2026-08` da **los mismos números que antes** del
      cambio (se comparan las dos salidas); el detalle del eje dice «planilla nueva».

## Cierre

- [x] **T12** — Higiene: `grep -rn "2026-08" src/` no muestra ningún literal de fecha de corte
      fuera de `marca.ts`; archivos ≤ 500 líneas y funciones ≤ 50 (`ms-auditorias/page.tsx` es el
      que más crece); sin `any`, sin `TODO`. `npm run typecheck` pasa.
- [x] **T13** — **Desbloqueada: P1 llegó con el criterio.** `NIVELES_AUDITORIA_NUEVA` en `marca.ts`
      con el corte único de 85 (≥85 cumple, debajo no cumple). Las dos leyendas provisorias de T7 y
      T10 no se escriben.
      **Hecho:** las auditorías de agosto 2026 tienen color y clasificación de la escala nueva;
      ninguna auditoría anterior al corte cambia de color.
- [x] **T14** — `features.json` (C16 a `done`, y sacar la nota del umbral de auditorías de
      `_esperando_definicion_de_daniela`, que P1 resolvió), `progress/CURRENT.md` y una línea en
      `progress/HISTORY.md`. El histórico de auditorías (P2) pasa a Pendientes de `CURRENT.md`
      como feature aparte.

## Verificación (la corre el REVISOR)

> **Corrida el 13/09/2026. Veredicto: pasa.** El revisor se cortó por límite de sesión con tres
> puntos abiertos y se completaron después: el diff de `marca.ts` (los umbrales de mystery y los
> cinco cortes de la planilla anterior quedaron intactos), los puntajes de mystery contra la base,
> y la tabla del Resumen fila por fila con sus colores.
>
> Verificado: `init.sh`, `typecheck`, `probar-auditorias.ts` (24 chequeos), `probar-score.ts
> 2026-08` y `build`, todos en verde. El promedio de agosto da **77,005**, que es el de las seis
> filas de la base. Colores leídos del HTML servido: auditorías **86,0 y 85,5 en verde · 75,6 ·
> 75,2 · 72,6 · 67,2 en rojo**; mystery sin tocar (**100 verde · 89,5 y 81,5 lima · 74,0 · 73,0 ·
> 72,0 · 69,4 · 65,3 ámbar**). El diff de `score.ts` muestra que lo único que cambió es el texto
> del detalle: ningún número del score se movió.
>
> **No se verificó:** el caso mixto en pantalla (las 6 auditorías son de agosto, se prueba con
> filas fijas), ni el hover real de los tooltips ni los anchos de pantalla, porque en esta máquina
> no hay navegador ni Playwright: se leyó el HTML servido.

Entorno:

- [ ] `bash init.sh` pasa.
- [ ] `npm run typecheck` pasa.
- [ ] `npx tsx scripts/probar-auditorias.ts` sale con código 0, con los números de CA-24.
- [ ] `npx tsx scripts/probar-score.ts 2026-08` da los mismos números que antes de C16.
- [ ] `npm run build` pasa.
- [ ] Levantar **sin tocar los dev servers de Daniela, que ocupan el 3100 y el 3101** (Next se
      planta si ya hay uno): bash `MODO_DEMO=1 npx next start -p 3104` · PowerShell
      `$env:MODO_DEMO='1'; npx next start -p 3104`.
      **Gotcha caro:** `kill` sobre `npx next start` mata el npx y deja el node escuchando, y ese
      server zombi sigue sirviendo el build viejo. Cerrar por PID del puerto
      (`netstat -ano | grep :3104` y `taskkill //PID <pid> //F`) y confirmar que quedó libre. Si
      `next start` dice EADDRINUSE, estás hablando con un server viejo: cambiá de puerto.

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
- [ ] La sección «Auditorías presenciales» lleva el aviso del corte, con el corte de 85 de la
      planilla nueva y los cinco cortes de la anterior.
- [ ] La tabla tiene la columna «Planilla»; las 6 auditorías de agosto dicen «nueva» y se pintan
      con el corte de 85: **Carlos Paz (86,04) y Luuma (85,46) cumplen**, Nueva Córdoba (75,23),
      General Paz (67,17), Urca (75,56) y Recta (72,57) no.
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
