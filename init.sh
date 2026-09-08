#!/usr/bin/env bash
# init.sh — Validá que el entorno esté sano antes de empezar a trabajar.
#
# Uso: bash init.sh
# Sale con 0 si todo está OK. Sale con 1 si algo crítico está mal.
# Los WARN no bloquean (solo informan).
#
# PARTICULAR DE ESTE PROYECTO:
#  - La app Next.js vive en la RAÍZ de esta carpeta.
#  - El dev server va en el puerto 3100 (el 3000 lo ocupa el de Papanato).
#  - `npm run dev` lleva --webpack a propósito: Turbopack no compila el CSS en
#    esta máquina (panic al compilar globals.css). Si las pantallas dan 500 y
#    /api/sync responde 200, esa es la firma de ese problema.

set -u
cd "$(dirname "$0")"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; DIM='\033[2m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; ERRORS=$((ERRORS+1)); }
warn() { echo -e "${YELLOW}!${RESET} $1"; }
info() { echo -e "${DIM}·${RESET} $1"; }

ERRORS=0
echo "── init · Dashboard CENFOR ──────────────────────────────"

# 1. Node + dependencias
info "Node.js"
command -v node >/dev/null 2>&1 && ok "node $(node --version)" || fail "node no está instalado"
[ -f "package.json" ] && ok "package.json" || fail "no encuentro package.json"
[ -d "node_modules" ] && ok "node_modules presente" || fail "faltan dependencias: npm install"

# 2. Secretos (nunca en el repo; siempre en .env.local)
info ".env.local"
if [ ! -f ".env.local" ]; then
  warn ".env.local no existe — cargá las claves de Supabase y Google"
else
  ok ".env.local presente"
  git check-ignore -q ".env.local" 2>/dev/null && ok "  ignorado por git" || fail "  .env.local NO está en .gitignore — arreglar YA"
  for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
    grep -q "^${var}=" ".env.local" && ok "  $var definida" || fail "  falta ${var}"
  done
  # Estas no impiden levantar la app, pero sin ellas el sync no escribe.
  for var in SUPABASE_SERVICE_ROLE_KEY GOOGLE_SERVICE_ACCOUNT_EMAIL; do
    grep -q "^${var}=" ".env.local" && ok "  $var definida" || warn "  sin $var (el sync no va a poder escribir)"
  done
fi

# 3. Typecheck (no bloqueante)
info "Typecheck (no bloqueante)"
if npm run typecheck --silent >/dev/null 2>&1; then
  ok "typecheck pasa"
else
  warn "typecheck falla — corré 'npm run typecheck' para ver el detalle"
fi

# 4. Migraciones versionadas (regla del kit: todo cambio de esquema deja su archivo)
info "Migraciones"
if [ -d "supabase/migrations" ]; then
  ok "supabase/migrations ($(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ') archivos)"
else
  warn "no hay supabase/migrations — el esquema no está versionado"
fi

# 5. El arnés está presente
info "Arnés"
[ -d ".claude/agents" ] && ok ".claude/agents presente" || warn ".claude/agents no está"
[ -f "features.json" ] && ok "features.json presente" || fail "falta features.json"
[ -f "progress/CURRENT.md" ] && ok "progress/CURRENT.md presente" || fail "falta progress/CURRENT.md"
[ -d "specs" ] && ok "specs/ presente" || warn "falta la carpeta specs/"

echo "────────────────────────────────────────────────────────"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}Entorno OK${RESET} — ahora leé progress/CURRENT.md y features.json."
  exit 0
else
  echo -e "${RED}${ERRORS} error(es) crítico(s)${RESET} — arreglá antes de seguir."
  exit 1
fi
