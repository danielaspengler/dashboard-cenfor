# Método de trabajo — Arnés (líder · implementador · revisor)

Arnés instalado desde `plantilla-arnes` el 2026-09-08. Prefijo de features: **C**.

**Lo primero en cada sesión:** `bash init.sh` → leer `progress/CURRENT.md` → mirar
`features.json`. El flujo completo está en `AGENTES.md`.

- Fuente de verdad: `features.json` (qué falta) + `specs/C{n}-{slug}/` (plan por
  feature) + `progress/CURRENT.md` (estado).
- Toda feature pasa por **planear → implementar → verificar**. Liviana (1-2 archivos, bajo
  riesgo): inline. Pesada (varios módulos, datos, auth/RLS, dudas de alcance): los subagentes
  de `.claude/agents/`. **Ante la duda, pesada.**
- **Se espera el OK de Daniela sobre la receta antes de implementar.**
- **Nadie declara "listo" sin verificar**: init.sh + typecheck + navegador si hay UI + números
  cruzados contra la fuente real.
- **Todo cambio de esquema deja su archivo en `supabase/migrations/`.**
- Al cerrar la sesión: actualizar `features.json`, reescribir `progress/CURRENT.md`, sumar
  una línea a `progress/HISTORY.md`.
