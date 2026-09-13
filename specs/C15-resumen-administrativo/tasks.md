# Tasks — C15 · Resumen administrativo

> El LÍDER las escribe; el IMPLEMENTADOR las marca `[x]` a medida que avanza.
> Spec aprobada y P1–P4 respondidas por Daniela el 11/09/2026 (`requirements.md`).
> (test) = se escribe la prueba primero y tiene que fallar antes del cambio.

## Cálculo

- [x] **T1 (test)** — `scripts/probar-economico.ts`, parte 1, **sin base**: filas fijas copiadas
      de la base (las 6 de agosto 2026, las 6 de julio 2026, las 5 de mayo 2025 y las 5 de enero
      2025; valores en `requirements.md` y en la consulta de abajo). Asserts sobre `totalizar()`:
      ticket agosto 27.827 con `conDato` de 4 locales; % fijos mayo 2025 = 20,86 con 1 local;
      % fijos enero 2025 `null` con 0 locales; julio % variables 70,11 con 5 locales (P2) y
      rentabilidad 3,44 con 5 locales, sin Poeta Lugones (P1). Correr
      `npx tsx scripts/probar-economico.ts`.
      **Hecho:** el script carga `economico.ts` (si no carga fuera de Next, aplicar la mitigación
      de `design.md` → Riesgos) y **falla** con el `totalizar()` actual (ticket 40.970).
- [x] **T2** — `economico.ts`: la función que decide si una fila tiene el dato de cada indicador
      (tabla de `design.md`), `Medida`, `Totales` nuevo, `totalizar()` reescrito, comentario de la
      rentabilidad corregido, `cmv`/`costos_*`/`cmv_pct` fuera de `Totales`, `porcentaje()`.
      **Hecho:** T1 pasa y `npm run typecheck` pasa.
- [x] **T3 (test)** — Sumar a T1 los asserts de variación agosto vs julio (valores sin redondear
      de CA-28, tolerancia 0,01) con la cantidad de locales del universo: órdenes +0,240% con 4,
      % variables −6,739 con 5. **Hecho:** fallan porque `variacion()` no existe.
- [x] **T4** — `economico.ts`: `variacion()` y `serieMensual()` (ventana de 13 meses en una
      constante). **Hecho:** T3 pasa; `serieMensual(filas, "2026-08")` devuelve 13 meses, de
      agosto 2025 a agosto 2026.
- [x] **T5** — `probar-economico.ts`, parte 2, **contra la base viva** (mismo cliente que
      `probar-score.ts`, con `.env.local`): imprime agosto 2026, julio 2026 y enero–agosto 2026 y
      los compara con CA-28 y CA-29. **Hecho:** sale con código 0 y la salida se pega en el PR o
      en la bitácora.
      Corrida del 11/09/2026 (102 filas, 47 chequeos, 0 fallas, código 0). Enero–agosto 2026:
      ventas 1.370.642.354,64 · órdenes 48.967 · ticket 26.756,49 · % fijos 25,43 ·
      % variables 69,64 · compras 43,91 · rentabilidad 3,86, los siete con 6 de 6 locales.
      Desvío menor: el script sale con `process.exitCode` y no con `process.exit()`, porque en
      Windows `process.exit()` con el fetch de Supabase cerrando aborta Node
      («UV_HANDLE_CLOSING») y devuelve un código distinto de 0 aunque todo dé.

## Componentes compartidos

- [x] **T6** — `ui.tsx`: prop opcional `neutra` en `Variacion`. `filtros.tsx`: prop opcional
      `porDefecto` en `FiltroOpciones`. `fuentes.ts`: `LOOKER_ECONOMICO`.
      **Hecho:** typecheck pasa; Delivery y el Informe por local se ven igual que antes (la
      variación de Delivery sigue en verde/rojo; el local del informe se sigue escribiendo en la
      URL).
- [x] **T7** — `src/components/graficos.tsx`: `GraficoBarras` (1 o 2 series) y `GraficoLinea`
      (huecos con `null`, punto aislado, línea del cero, `dominio` opcional), según `design.md`.
      Solo variables de color de `globals.css`. **Hecho:** typecheck pasa; `grep -nE "#[0-9a-fA-F]{3,6}\b"
      src/components/graficos.tsx` no muestra ningún color escrito a mano.

## Pantalla

- [x] **T8** — `navigation.ts`: área «Administración» con «Resumen administrativo» y comentario
      actualizado. **Hecho:** el menú muestra las dos áreas; la sección nueva da 404 hasta T9.
      Nota: el 404 intermedio no se miró en navegador (T9 se escribió enseguida).
- [x] **T9** — `page.tsx`, primera parte: lectura de datos, filtros (`leerLocal`, `leerMes`,
      `mesAnterior`), encabezado, línea de contexto con los locales sin datos, estado vacío.
      **Hecho:** `/administracion/resumen` abre en agosto 2026; `?local=censurado-poeta-lugones`
      ofrece solo julio y agosto; un slug o mes inventado cae en el default.
- [x] **T10** — Las siete tarjetas con cobertura («4 de 6 locales · sin dato en…») y variación
      neutra con «mismos N locales». Nota del criterio en una línea.
      **Hecho:** agosto y julio 2026 coinciden con la tabla de CA-28.
      Desvío menor: design.md dice «mismos N locales» cuando el universo es menor que el
      `conDato` de la tarjeta; con eso órdenes y ticket de agosto (4 = 4) no llevaban la
      aclaración que CA-28 espera. Se aclara cuando el universo es menor que los locales con el
      dato en **cualquiera** de los dos meses. Da exacto las siete variaciones de CA-28.
- [x] **T11** — Los cuatro bloques de evolución y la línea «Sin dato: …» debajo de cada uno.
      **Hecho:** la barra de agosto 2026 en ventas y el punto de agosto en ticket muestran en el
      tooltip lo mismo que las tarjetas; con `?mes=2025-06` el gráfico de fijos y variables deja
      hueco y dice «Sin dato: enero a mayo 2025».
- [x] **T12** — Tabla por local del mes (P4 aprobada, solo con «Todos los locales»). **Hecho:** agosto 2026 muestra
      6 filas, General Paz y Poeta Lugones con órdenes y ticket «sin dato».
- [x] **T13** — `page.tsx` ≤ 500 líneas y funciones ≤ 50 (CALIDAD.md); sin `any`, sin `TODO`.
      **Hecho:** `npm run typecheck` pasa.
      Verificado por el revisor el 13/09/2026: `page.tsx` 431 líneas, función más larga 48
      (`ResumenAdministrativoPage`); sin `any` ni `TODO`. Desvío menor fuera de T13:
      `graficos.tsx` tiene dos funciones de 55 y 57 líneas (`GraficoBarras`, `GraficoLinea`).

## Cierre

- [ ] **T14** — `features.json` (C15 y la nota de C13: vuelve Administración, Marketing no),
      `progress/CURRENT.md`, una línea en `progress/HISTORY.md`. La lista «Para avisar al cliente»
      de `requirements.md` pasa a Pendientes de `CURRENT.md`.

## Verificación (la corre el REVISOR)

Entorno:

> Corrida del revisor, 13/09/2026. Lo que quedó sin tildar es lo que no se pudo correr, con el
> motivo al final del bloque.

- [x] `bash init.sh` pasa. «Entorno OK», typecheck incluido.
- [x] `npm run typecheck` pasa (`tsc --noEmit`, sin salida).
- [x] `npx tsx scripts/probar-economico.ts` sale con código 0: 47 chequeos, 0 fallas, 102 filas.
- [x] `npm run build` pasa (Next 16.2.10, compiló en 4 s; esta vez sin panic de Turbopack).
      `/administracion/resumen` aparece como ƒ (dinámica).
- [x] Levantar **sin tocar el dev server de Daniela en el 3100** (Next se planta si ya hay uno):
      el 3101 ya estaba ocupado por un `next start` viejo (404 en `/administracion/resumen`) que
      no abrió este revisor, así que se levantó en el **3102** y se cerró solo ese.
      bash `MODO_DEMO=1 npx next start -p 3101` · PowerShell
      `$env:MODO_DEMO='1'; npx next start -p 3101`. Si no hay `SUPABASE_SERVICE_ROLE_KEY` en
      `.env.local`, el modo demo no lee: decirlo, no disfrazarlo.

Navegador (a 1280 px y a 390 px de ancho), en `http://localhost:3101`:

- [x] Menú: aparece «Administración › Resumen administrativo» y lleva a `/administracion/resumen`.
- [x] **CA-28, agosto 2026, todos los locales** (sin parámetros): ventas $ 188,5 M · 6 de 6 ·
      órdenes 4.600 · 4 de 6, sin dato en General Paz y Poeta Lugones · ticket $ 27.827 ·
      % fijos 26,8% · % variables 62,1% · compras 43,7% · rentabilidad 10,4%. Variaciones:
      ventas ▼ 3,6% · órdenes ▲ 0,2% mismos 4 locales · ticket ▼ 3,5% mismos 4 · fijos ▲ 3,4 pts ·
      variables ▼ 6,7 pts mismos 5 · compras ▲ 1,2 pts mismos 5 · rentabilidad ▲ 6,6 pts
      mismos 5.
- [x] **Julio 2026** (`?mes=2026-07`): ventas $ 195,5 M · órdenes 6.708 · ticket $ 29.137 ·
      % fijos 23,4% · % variables 70,1% 5 de 6 · compras 43,0% 5 de 6 · rentabilidad 3,4% 5 de 6,
      sin dato en Poeta Lugones.
- [x] **Mayo 2025** (`?mes=2025-05`): % fijos 20,9% · 1 de 5 locales · ticket $ 20.323 · 5 de 5.
- [x] **Enero 2025** (`?mes=2025-01`): los cuatro porcentajes dicen «sin dato», ninguno 0%;
      ventas $ 99,5 M · órdenes 4.981 · ticket $ 19.967. Sin variación en los porcentajes.
- [x] **Poeta Lugones** (`?local=censurado-poeta-lugones`): la fecha ofrece solo agosto y julio
      2026; agosto dice órdenes y ticket «sin dato»; no hay tabla por local; julio no tiene
      variación (es su primer mes).
- [x] **Entradas inválidas**: `?mes=2030-01` → agosto 2026; `?local=inventado` → todos los
      locales. Ninguna rompe la pantalla.
- [ ] Elegir «Todos los locales» después de un local deja la URL sin `local=`. **Sin verificar en
      navegador** (es un `onChange` de cliente): revisado en código, `FiltroOpciones` recibe
      `porDefecto={LOCAL_TODOS}` y `useCambiarParam` hace `delete` del parámetro.
- [x] El menú arrastra `mes` y `local`: ir a Delivery y volver conserva el filtro o cae en el
      default sin pantalla en blanco.
- [x] La línea de contexto nombra Luuma y los tres locales de Formaggio como sin datos
      económicos; ninguno aparece con ceros en tarjetas, gráficos ni tabla.
- [x] La nota del Looker está, en una línea, y nombra «Informe franquicias Censurado».
- [x] Gráficos: 13 meses (ago 2025–ago 2026) con agosto 2026 marcado; tooltip en barras y puntos;
      rentabilidad por local en seis gráficos con la misma escala y la línea del cero.
      Los tooltips se verificaron como `<title>` dentro de cada barra y punto en el HTML servido,
      no pasando el mouse.
- [x] Sin verde ni rojo: ninguna variación, barra o línea usa `#15803d` / `#b91c1c` ni otro color
      de semáforo (mirarlo en pantalla y con grep en los archivos nuevos).
- [x] Tono: cuenta de rayas (—) visibles en la pantalla ≤ 1; los vacíos dicen «sin dato»; ningún
      separador decimal con punto.
- [x] Sin sesión (build normal, sin `MODO_DEMO`): `/administracion/resumen` redirige a `/login`.
      Probado contra el dev server del 3100 (sin `MODO_DEMO`): 307 con `location: /login`.
      **No se probó** el «Sin acceso» de un mail fuera de `emails_autorizados` (CA-2): haría falta
      una sesión de Google con otro mail.
- [x] Delivery y el Informe por local siguen funcionando igual (T6). Delivery conserva la variación
      en verde/rojo (`#15803d`/`#b91c1c` en su HTML) y el Informe sigue escribiendo el local en la
      URL (no pasa `porDefecto`).
- [x] Cada criterio de `requirements.md` cumplido o marcado como no verificado, con el motivo.

**No verificado, con motivo:** el ancho de 1280 px y 390 px y el hover real de los tooltips (no hay
navegador ni Playwright en esta máquina; todo se leyó del HTML servido en el 3102), y el «Sin
acceso» de CA-2.

Consulta de apoyo para cruzar números (solo lectura, Supabase `rnismttcxwrydcyxpygs`):

```sql
select l.name, f.period_start, f.ventas, f.ordenes, f.rentabilidad_neta_pct,
       f.costos_fijos_pct, f.costos_variables_pct, f.compras_ventas_pct
from financials f join locations l on l.id = f.location_id
where f.period_start in ('2026-07-01', '2026-08-01', '2025-05-01', '2025-01-01')
order by f.period_start, l.name;
```
