# Agentes & Arnés — el método de trabajo

> El arnés es el entorno que rodea al trabajo: **contexto en archivos, roles separados,
> verificación contra la realidad.** El modelo de IA cambia cada pocos meses; el arnés se
> queda. Este archivo es el mapa: qué hay y cómo trabajamos.
>
> `C` = el prefijo de features de este proyecto (ej. F en ORIGEN, D en el Dashboard).

## Antes de tocar nada

1. Correr `bash init.sh` — valida que el entorno esté sano. Si algo crítico falla, arreglar primero.
2. Leer `progress/CURRENT.md` — el estado de la sesión anterior, qué quedó en curso.
3. Mirar `features.json` — qué features hay y en qué estado.

## Los archivos del arnés

| Archivo | Para qué |
|---|---|
| `init.sh` | Valida el entorno (deps, env, servicios) antes de trabajar. |
| `features.json` | Lista de features con `id` / `title` / `status`. La fuente de verdad de "qué falta". |
| `progress/CURRENT.md` | Estado de AHORA: feature activa, qué está en curso, próximo paso. Se reescribe cada sesión. |
| `progress/HISTORY.md` | Log comprimido, una línea por sesión cerrada. Append-only. |
| `progress/YYYY-MM-DD-{slug}.md` | Bitácora detallada (opcional, solo cuando hubo algo contra-intuitivo). |
| `specs/C{n}-{slug}/` | Una carpeta por feature: `requirements.md` + `design.md` + `tasks.md`. |
| `supabase/migrations/` | La historia del esquema de la base, versionada. Todo cambio de esquema deja su archivo acá. |
| `.claude/agents/` | Los 3 roles del flujo: `lider`, `implementador`, `revisor`. |

## El flujo: planear → implementar → revisar

Hay dos modos. **Al arrancar una feature, elegí cuál usar** (o proponé uno con criterio y
confirmá con el humano).

### Liviana — tareas chicas
Un fix, un ajuste, una feature de 1-2 archivos y bajo riesgo. Hacé las 3 fases inline, en una
sola sesión, sin invocar subagentes. Más rápido, menos ceremonia — pero las 3 fases igual
existen: pensás, implementás, verificás.

### Pesada — código mediano o heavy
Feature grande o riesgosa (toca varios módulos, datos, auth, permisos, o no está claro el
alcance). Se invocan los 3 subagentes con contexto limpio:

1. **lider** → lee el contexto, escribe `specs/C{n}-{slug}/` (requirements + design + tasks).
   **Espera aprobación humana antes de seguir** (Blueprint-First).
2. **implementador** → escribe el código siguiendo `tasks.md`. Cambios quirúrgicos, nada de más.
3. **revisor** → corre `init.sh`, tests, typecheck, Playwright. Reporta. **No declara "listo" sin verificar.**

```
        ┌─────────┐  spec   ┌──────────────┐  código  ┌─────────┐  veredicto
  ──►   │  LÍDER  │ ──────► │ (aprobación) │ ───────► │ IMPLEM. │ ────────►  REVISOR ──► ✓ / ✗
        └─────────┘         │   humana     │          └─────────┘             │
             ▲              └──────────────┘                                  │ si ✗
             └──────────────── vuelve si el desvío es de diseño ◄─────────────┘
```

> Regla rápida: ¿1-2 archivos y bajo riesgo? Liviana. ¿Toca varios módulos, datos, auth, o no
> estás seguro del alcance? Pesada. **Ante la duda, pesada.**

## Por qué separar los roles

- El **líder** no se enamora de una implementación porque todavía no escribió ninguna.
- El **implementador** no se dispersa: tiene una spec aprobada y la sigue.
- El **revisor** no tiene sesgo de autor: no escribió el código, así que lo prueba en serio.

Esa separación es lo que sube la calidad: cada rol tiene un solo trabajo y un contexto limpio.

## Al cerrar la sesión

1. Actualizar `features.json` (estados que cambiaron).
2. Reescribir `progress/CURRENT.md` con el nuevo estado.
3. Agregar una línea a `progress/HISTORY.md`.
4. Si hubo algo contra-intuitivo (un bug raro, un camino descartado), dejar un
   `progress/YYYY-MM-DD-{slug}.md` detallado.

---

Detalle de herramientas y cómo se ejecutan las skills → `HERRAMIENTAS-Y-SKILLS.md`.
El estándar de calidad que todos los roles respetan → `CALIDAD.md`.
