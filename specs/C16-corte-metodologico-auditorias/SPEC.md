# C16 — Corte metodológico en auditorías presenciales

**Estado: receta escrita, falta el OK de Daniela. No implementada.**
Escrita el 11/09/2026.

---

## El problema

**El cliente cambió la puntuación de las planillas de auditoría en agosto de 2026 para ser más
exigente**, porque el puntaje total no reflejaba lo que pasaba de verdad adentro del local.
(Dato de Daniela, 11/09/2026. El mystery shopper **no** se modificó.)

Consecuencia: **los puntajes de auditoría anteriores a agosto 2026 y los posteriores no son
comparables.** La caída que se ve es cambio de vara, no deterioro operativo.

Orden de magnitud, medido sobre la planilla del Looker:

| Período | Planilla | Visitas | Promedio |
|---|---|---|---|
| ene 2025 – jul 2026 | anterior | 110 | **89,4%** |
| ago 2026 | nueva | 6 | **76,9%** |

Agosto por local: General Paz 67,2 · Recta 72,6 · Nueva Córdoba 75,2 · Urca 75,6 ·
Luuma 85,0 · Carlos Paz 86,0. Julio venía en 86,4%.

**Hoy el dashboard no sabe nada de esto.** A medida que entren auditorías nuevas va a mostrar
un derrumbe de diez puntos que no ocurrió, y cualquier promedio que cruce agosto va a mezclar
dos escalas.

## Qué hay que hacer

### 1. Marcar la fecha de corte en un solo lugar

Una constante, no un número suelto repetido:

```ts
// src/lib/calidad.ts (o donde convenga)
export const CORTE_AUDITORIAS = "2026-08-01"; // desde acá rige la planilla exigente
```

### 2. No promediar a través del corte

Cualquier promedio de auditoría que incluya meses de los dos lados **tiene que separarse o
declararse**. Revisar todos los usos de `promedioValido()` sobre auditorías.

### 3. Avisar en la pantalla

En `src/app/(panel)/operaciones/ms-auditorias/page.tsx`, la bajada dice hoy:

> "Puntajes calculados por las planillas del cliente · mystery shopper ≥90 excelente, ≥75 bueno,
> ≥60 regular · auditoría ≥95, ≥90, ≥70, ≥50"

Falta que diga que desde agosto 2026 la planilla de auditoría es más exigente, y que los
puntajes anteriores no se comparan con los nuevos.

### 4. Revisar los umbrales del semáforo

**Esto es lo que hay que preguntarle al cliente antes de tocar nada:** los umbrales de auditoría
(≥95 excelente, ≥90, ≥70, ≥50) venían de la planilla vieja. Con la nueva, **ningún local llegó
a 90 en agosto**. O los umbrales cambian con la planilla, o todo el semáforo va a quedar en rojo
sin que eso signifique nada.

Enlaza con el pendiente que ya estaba abierto: *"umbral de aceptación de auditorías"*.

### 5. Marcarlo en el gráfico

Donde haya serie temporal de auditorías, marcar el corte. En la presentación del Cluster ya se
resolvió así, y conviene que el tablero se vea igual: línea de puntos vertical en agosto, sombra
sobre el tramo nuevo, el tramo posterior punteado y dos etiquetas ("medido con la planilla
anterior" / "planilla nueva, más exigente").
Referencia: `HOLT/CENFOR/Presentacion-Camara/graficos.js`, función `calidad()`.

## Qué NO hay que hacer

- **No recalcular ni "corregir" los puntajes viejos.** Son válidos con su escala.
- **No borrar el histórico.** El valor del dashboard es justamente ser el archivo que la
  planilla no tiene.

## Verificación

- El promedio de auditorías de un rango que cruce agosto 2026 no sale como un número único
  sin advertencia.
- La pantalla de MS y auditorías avisa del corte.
- La serie temporal muestra el quiebre.
- Números cruzados contra la planilla del Looker (`Agrupado Looker - Censurado.xlsx`, hoja
  `Puntaje auditorias`): 110 visitas a 89,4% hasta julio, 6 visitas a 76,9% en agosto.

## Antes de implementar

1. **OK de Daniela sobre esta receta.**
2. **Confirmar con el cliente los umbrales nuevos** del semáforo de auditoría (punto 4).
3. Terminar la verificación de C15, que quedó `in_progress`.
