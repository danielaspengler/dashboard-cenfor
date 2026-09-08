# Herramientas y skills — cómo se ejecuta todo

> Cómo el arnés usa las capacidades de Claude Code: subagentes, herramientas y skills.
> Está escrito para que **tu propio Claude Code** entienda el método y lo ejecute solo.

## 1. Los subagentes (los 3 roles)

Los roles `lider`, `implementador` y `revisor` viven en `.claude/agents/*.md`. Claude Code
los descubre automáticamente cuando esta carpeta está en la raíz del proyecto (o mergeada en
tu `.claude/`). Cada uno tiene:

- Un **rol** (qué hace y qué NO hace).
- Un set de **herramientas** acotado a su función (ver tabla abajo).
- Corre con **contexto limpio**: no arrastra la conversación de los otros roles.

Se invocan con la herramienta de subagentes (Task/Agent). En la práctica, le decís a tu
Claude Code, por ejemplo:

> "Modo pesada para la feature C5. Arrancá con el **lider**: leé el contexto y
> escribí la spec. No implementes hasta que yo apruebe."

y luego, tras aprobar:

> "Pasá al **implementador** con la spec aprobada." … "Ahora el **revisor**, verificá."

### Herramientas por rol (por diseño, cada uno tiene solo lo que necesita)

| Rol | Herramientas | Por qué |
|---|---|---|
| **lider** | Read, Grep, Glob, Bash | Lee y explora. **No escribe código** (no tiene Write/Edit). |
| **implementador** | Read, Write, Edit, Grep, Glob, Bash | Es el único que modifica archivos. |
| **revisor** | Read, Grep, Glob, Bash | Verifica y corre comandos. **No escribe features** (no tiene Write/Edit). |

Que el líder y el revisor **no tengan** Write/Edit no es un olvido: es lo que garantiza que el
líder planee y el revisor verifique, en vez de "arreglarlo ellos mismos" y romper la separación.

> **Nota sobre Playwright:** el revisor prueba la UI vía Bash (`npx playwright ...`) o con las
> herramientas MCP de Playwright si están disponibles en la sesión. Al instalar el arnés en una
> app nueva, verificá que una de las dos vías funcione (el `init.sh` puede chequearlo).

## 2. Qué es una skill y cómo se ejecuta

Una **skill** es una capacidad empaquetada (un instructivo + a veces scripts) que Claude Code
carga cuando hace falta. Viven en `.claude/skills/<nombre>/SKILL.md` (o llegan por plugins).

- Se invocan con la **herramienta Skill** o escribiendo `/<nombre-skill>`.
- Cuando se invoca, su contenido se carga en contexto y Claude sigue esas instrucciones.
- Se usan para trabajo especializado repetible (por ejemplo: revisión de código, generar un
  tipo de documento, correr una auditoría). No hace falta pegar nada a mano.

**Este arnés no depende de skills privadas de nadie.** Funciona con las capacidades nativas de
Claude Code. Si querés sumar skills para subir la calidad, las candidatas típicas son:

- Una skill de **revisión de código** que el revisor invoque antes de dar el veredicto.
- Una skill de **TDD** para features con lógica delicada.
- `/init` de Claude Code para generar/actualizar el `CLAUDE.md` del proyecto.

Cómo se relacionan skills y arnés: **el arnés es el flujo (quién hace qué), la skill es una
herramienta que un rol puede usar dentro de su fase.** El revisor puede invocar una skill de
review; el líder puede invocar una de investigación. La skill no reemplaza el flujo.

> **Cómo convive con la skill `receta` del kit:** son complementarias. La `receta` es la
> entrevista de alto nivel para pensar un **módulo o app nuevos** de cero (idea grande y
> difusa); su salida se convierte en spec(s) del líder. El **líder** del arnés es el
> planificador **por feature** dentro del build.

## 3. Herramientas nativas que usan los roles

- **Read / Grep / Glob** — leer y buscar en el código (los tres roles exploran así).
- **Write / Edit** — crear y modificar archivos (solo el implementador).
- **Bash** — correr comandos: `./init.sh`, `npm run typecheck`, tests, git.
- **Navegador (Playwright)** — el revisor prueba la UI en un navegador real cuando la hay.
- **Subagentes (Task/Agent)** — para invocar a lider/implementador/revisor con contexto limpio.
- **TodoWrite** — para trackear el avance de una feature con varias tasks.
- **MCP de Supabase** — para aplicar migraciones y consultar la base. Regla: todo cambio de
  esquema que se aplica por acá deja su archivo gemelo en `supabase/migrations/`.

## 4. El bucle completo, en concreto

```
1. init.sh OK  +  leer progress/CURRENT.md + features.json
2. Elegir feature y modo (liviana / pesada)
3. [pesada] lider → spec en specs/C{n}-{slug}/  → APROBACIÓN HUMANA
4. [pesada] implementador → código siguiendo tasks.md
5. [pesada] revisor → init.sh + typecheck + tests + Playwright → ✓/✗
6. Si ✗ → vuelve al implementador (o al líder si el desvío es de diseño)
7. Si ✓ → actualizar features.json + progress/CURRENT.md + HISTORY.md
```

En **liviana** es el mismo bucle, pero las 3 fases las hace la misma sesión sin subagentes.

---

Reglas de calidad que atraviesan todo esto → `CALIDAD.md`.
