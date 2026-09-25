# C17 — Histórico de auditorías (ene 2025 – jul 2026)

**Estado: implementada, falta escribir en la base y verificar.**
Escrita el 25/09/2026. Decisiones de Daniela tomadas el mismo día (ver «Decisiones»).

- [x] Script `scripts/cargar-historico-auditorias.ts`. Ensayo en seco del 25/09/2026: 114 filas
  (112 activas + 2 de Alta Córdoba), 0 descartadas, 6 desde el corte sin cargar, conteo por mes
  igual al relevamiento, 89,48% en las 112 activas, julio 2026 86,35% en 6.
- [x] MS y Auditorías: columna Nivel, «sin desglose · histórico del Looker», Alta Córdoba con
  marca de cerrado, «día estimado» en la fecha.
- [x] Informe por local: aviso de sin desglose para el histórico, «(día estimado)» en la bajada.
- [x] Resumen: verificado en el código, los promedios de marca salen de locales activos. Sin cambios.
- [ ] `--escribir` (lo corre el líder), segunda corrida, pantallas en el navegador.

---

## El problema

La planilla de auditorías que lee el sync guarda solo la última auditoría de cada local. La base
tiene 6 filas, todas de agosto 2026. Las 114 auditorías anteriores viven solo en la hoja
`Puntaje auditorias` de la planilla del Looker (`Agrupado Looker - Censurado.xlsx`).

Mientras no estén en la base:

- el corte de C16 no se ve funcionando en ninguna pantalla (ningún promedio cruza agosto);
- el informe por local de cualquier mes anterior a agosto 2026 sale sin auditoría, y el score de
  calidad reparte su 30% entre los otros ejes.

## Qué trae la hoja

Relevado el 25/09/2026 sobre la copia local del xlsx:

| | |
|---|---|
| Columnas | `FECHA` · `LOCAL` · `PUNTUACIÓN` (fracción, 0,8967 = 89,67%) · `Fecha_mes` (vacía) |
| Filas | 120, todas de Censurado |
| Anteriores al 01/08/2026 | 114 una vez aplicadas las correcciones de abajo (112 de locales activos + 2 de Alta Córdoba, ene y feb 2025) |
| Agosto 2026 | 6, **ya están en la base** |
| Desglose por dimensión | **no hay.** Solo el puntaje total |
| Auditor / franquiciado | no hay |

Agosto 2026 cruzado contra la base: coincide al centésimo en 5 de 6. Luuma da 85,46 en la base
(planilla de auditoría) y 85,00 en el Looker. Como agosto no se carga desde acá, gana la base.

Textos de local: `Urca`, `Recta Martinolli` (una vez `recta Martinolli`), `Nueva Cordoba`,
`Luuma`, `General Paz`, `Carlos Paz`, `Alta Cordoba`.

## Decisiones (Daniela, 25/09/2026)

1. **Carga única, no fuente del sync.** Un script lee el xlsx y guarda las filas anteriores al
   `CORTE_AUDITORIAS`. Desde agosto la fuente sigue siendo la planilla de auditoría, que trae
   las dimensiones. Así no hay dos fuentes compitiendo por la misma auditoría.
2. **Nueva Córdoba 26/12/2026 → 26/12/2025.** Está entre las filas de nov y dic 2025, y a
   diciembre 2025 le falta justo Nueva Córdoba.
3. **Nueva Córdoba 28/02/2025, la segunda fila (94,00%) → marzo 2025.** Está entre las filas de
   marzo y a marzo le falta Nueva Córdoba. El día no se sabe: va con **28/03/2025** y queda
   marcada como fecha estimada. La primera (98,92%) queda el 28/02/2025.
4. **Alta Córdoba se carga**, como archivo histórico. El local ya existe inactivo.

## Qué hay que hacer

### 1. El script de carga — `scripts/cargar-historico-auditorias.ts`

- Lee `../../Agrupado Looker - Censurado.xlsx`, hoja `Puntaje auditorias`, columnas **por
  nombre de encabezado**, no por posición.
- Solo filas con fecha `< CORTE_AUDITORIAS`, después de aplicar las correcciones 2 y 3.
- Las correcciones van en una lista explícita dentro del script (fila de origen, fecha original,
  fecha corregida, motivo), no como lógica general.
- Local: texto de la hoja → `locations` con el mapeo de siempre (`src/lib/sync/locales.ts`),
  sumando `Recta Martinolli` y `Alta Cordoba`. Sin match, la fila no se guarda y se informa.
- `score_pct` en porcentaje con dos decimales, como las filas de agosto (0,8967 → 89,67).
- `categories`, `auditor` y `franchisee` en null.
- `source_sheet`: `Looker · histórico`, o `Looker · histórico · fecha estimada` en la fila de la
  decisión 3. Así la marca queda en la base sin cambiar el esquema.
- `source_row_hash`: `auditoria|<local normalizado>|<fecha>`, el mismo formato del parser, con el
  nombre del local de la base normalizado (`recta`, `nueva cordoba`…). Así una segunda corrida
  no duplica nada.
- Modo `--seco` por defecto: imprime qué guardaría, con conteos por local y por mes. Escribe solo
  con `--escribir`.

Esperado: **114 filas** (112 de locales activos + 2 de Alta Córdoba), cero descartadas.

### 2. Las pantallas con filas sin desglose

- **MS y Auditorías**: el listado muestra la auditoría histórica con su puntaje y su nivel
  (escala anterior), y donde irían las dimensiones dice «sin desglose · histórico del Looker».
  Las de Alta Córdoba aparecen con su nombre y la marca de cerrado, no con el local vacío.
- **Informe por local**: con una auditoría histórica, la sección de auditoría muestra el puntaje
  y el nivel y dice que ese mes no tiene desglose por dimensión. No dibuja nueve barras vacías.
- **Promedios de marca (Resumen)**: Alta Córdoba no entra. Hoy ya pasa porque el Resumen solo
  mira locales activos; verificarlo, no reescribirlo.
- La fecha estimada se ve como tal donde aparezca esa auditoría.

### 3. Lo que ya está hecho y solo hay que ver funcionando

El corte de C16: con «Todo», el Resumen tiene que mostrar el promedio partido en dos tramos
(anterior / nueva) y la serie de MS y Auditorías el quiebre en agosto.

## Qué NO hay que hacer

- No tocar el sync diario ni sumar una fuente.
- No cargar agosto 2026 desde el Looker, ni «corregir» el 85,46 de Luuma.
- No recalcular puntajes viejos con la vara nueva.
- No inventar dimensiones para las auditorías históricas.

## Verificación

- Ensayo en seco: 114 filas, por mes igual al relevamiento (ene 2025: 7 · feb: 7 · mar: 4 ·
  … · dic 2025: 6 · mar 2026: 8 · jul 2026: 6), cero descartadas.
- En la base, después de escribir: 120 auditorías. Una segunda corrida deja 120.
- Promedio de las 112 de locales activos anteriores al corte: **89,48%**. C16 hablaba de 110 visitas a 89,4%, contadas antes de este relevamiento. La diferencia de 2 visitas mueve el promedio menos de una décima. El número bueno es este.
  Contra la hoja, al centésimo.
- Con «Todo», el Resumen muestra los dos tramos; con julio 2026, un solo número de escala
  anterior (86,35% en 6).
- Informe por local de Carlos Paz, julio 2026: auditoría con puntaje y aviso de sin desglose.
- typecheck, build, `bash init.sh`, y las tres pantallas en el navegador.

## Modo

**Pesada**: escribe datos en producción y toca tres pantallas. Implementador + revisor.
