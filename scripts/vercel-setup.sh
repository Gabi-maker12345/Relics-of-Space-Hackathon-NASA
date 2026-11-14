#!/usr/bin/env bash
# Liga o repositório a um projeto Vercel, define as env de produção/preview e
# faz o deploy de produção. Requer `vercel login` (ou VERCEL_TOKEN) feito.
#
#   ./scripts/vercel-setup.sh                # cria/liga "relics-of-space" e publica
#   PROJECT=outro ./scripts/vercel-setup.sh  # usa outro nome de projeto
set -euo pipefail

PROJECT="${PROJECT:-relics-of-space}"
ENV_FILE="${ENV_FILE:-.env.vercel}"
VERCEL="${VERCEL:-vercel}"

if ! command -v "$VERCEL" >/dev/null 2>&1; then
  echo "vercel CLI não encontrado. Instala com: npm i -g vercel --prefix \"\$HOME/.local\""
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Falta $ENV_FILE (NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY, NUXT_SUPABASE_SECRET_KEY)."
  exit 1
fi

"$VERCEL" whoami >/dev/null || { echo "Sessão Vercel em falta: corre 'vercel login'."; exit 1; }

echo "→ a ligar ao projeto $PROJECT"
"$VERCEL" link --yes --project "$PROJECT"

add_env() {
  local name="$1" value="$2" target="$3"
  if [ -z "$value" ]; then
    echo "  ! $name vazio em $ENV_FILE — ignorado"
    return
  fi
  printf '%s' "$value" | "$VERCEL" env add "$name" "$target" >/dev/null 2>&1 \
    && echo "  + $name ($target)" \
    || echo "  = $name ($target) já existia"
}

set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

for target in production preview; do
  add_env NUXT_PUBLIC_SUPABASE_URL "${NUXT_PUBLIC_SUPABASE_URL:-}" "$target"
  add_env NUXT_PUBLIC_SUPABASE_KEY "${NUXT_PUBLIC_SUPABASE_KEY:-}" "$target"
  add_env NUXT_SUPABASE_SECRET_KEY "${NUXT_SUPABASE_SECRET_KEY:-}" "$target"
done

echo "→ deploy de produção"
"$VERCEL" --prod --yes

echo "→ domínio: https://$PROJECT.vercel.app"
