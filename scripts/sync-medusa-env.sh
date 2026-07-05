#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# --project NAME targets an alternate compose project (e.g. the ephemeral
# "erp-staging" stack used by CI) instead of the default prod project, and
# writes only storefront/.env (not .env.development, which is dev-only).
COMPOSE_PROJECT_ARGS=()
ENV_FILES=(
  "$ROOT_DIR/storefront/.env.development"
  "$ROOT_DIR/storefront/.env"
)
IS_STAGING=false

if [ "${1:-}" = "--project" ]; then
  # erp-staging is the only alternate project this script ever targets, so
  # the matching compose file is implied rather than taking a separate flag.
  COMPOSE_PROJECT_ARGS=(--project-name "$2" --file "$ROOT_DIR/docker-compose.staging.yml")
  ENV_FILES=("$ROOT_DIR/storefront/.env")
  IS_STAGING=true
fi

compose() {
  if [ "${#COMPOSE_PROJECT_ARGS[@]}" -gt 0 ]; then
    docker compose "${COMPOSE_PROJECT_ARGS[@]}" "$@"
  else
    docker compose "$@"
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if ! compose ps db >/dev/null 2>&1; then
  echo "db service is not available. Start compose first." >&2
  exit 1
fi

query_db() {
  local sql="$1"
  compose exec -T db psql -U medusa -d medusa -t -A -c "$sql" | tr -d '\r' | sed '/^$/d' | head -n1
}

upsert_env_var() {
  local env_file="$1"
  local key="$2"
  local value="$3"

  local tmp
  tmp="$(mktemp)"

  if [ -f "$env_file" ]; then
    awk -v k="$key" -v v="$value" '
      BEGIN { replaced = 0 }
      $0 ~ "^" k "=" { print k "=" v; replaced = 1; next }
      { print }
      END { if (!replaced) print k "=" v }
    ' "$env_file" > "$tmp"
  else
    printf '%s=%s\n' "$key" "$value" > "$tmp"
  fi

  mv "$tmp" "$env_file"
}

PUBLISHABLE_KEY="$(query_db "select token from api_key where type='publishable' and deleted_at is null and revoked_at is null order by created_at desc limit 1;")"
REGION_ID="$(query_db "select id from region where currency_code='ars' and deleted_at is null order by created_at desc limit 1;")"

if [ -z "$PUBLISHABLE_KEY" ]; then
  echo "No publishable API key found in database" >&2
  exit 1
fi

if [ -z "$REGION_ID" ]; then
  echo "No ARS region found in database" >&2
  exit 1
fi

for env_file in "${ENV_FILES[@]}"; do
  upsert_env_var "$env_file" "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" "$PUBLISHABLE_KEY"
  upsert_env_var "$env_file" "NEXT_PUBLIC_MEDUSA_REGION_ID" "$REGION_ID"
  upsert_env_var "$env_file" "NEXT_PUBLIC_MEDUSA_COUNTRY_CODE" "ar"
  if [ "$IS_STAGING" = true ]; then
    # storefront/.env is the same physical file prod uses, where this is
    # intentionally set to the real prod domain (e.g. backoffice.aurorapormayor.com).
    # Staging serves over a different origin (127.0.0.1:7458) that prod's CORS
    # config rightfully doesn't allow, so an inherited absolute backend URL
    # makes every store API call fail CORS preflight with no products ever
    # loading. Clearing it falls back to the relative /api/medusa proxy
    # (same-origin, no CORS involved) per src/lib/medusa.ts's own fallback.
    upsert_env_var "$env_file" "NEXT_PUBLIC_MEDUSA_BACKEND_URL" ""
    # next.config.ts's rewrites() resolves MEDUSA_INTERNAL_BACKEND_URL into
    # routes-manifest.json at build time (Next.js compiles a static rewrite
    # destination string, it isn't re-read at container startup) — relying on
    # docker-compose.staging.yml's runtime `environment:` override alone left
    # it frozen at the next.config.ts fallback ("http://localhost:9000"),
    # which doesn't exist inside the `web` container, breaking the
    # /api/medusa proxy with ECONNREFUSED. Prod never hit this because it
    # bypasses the proxy entirely via the absolute NEXT_PUBLIC_MEDUSA_BACKEND_URL
    # above. Setting it here makes it available at build time too.
    upsert_env_var "$env_file" "MEDUSA_INTERNAL_BACKEND_URL" "http://backend:9000"
  fi
  echo "Synced ${env_file#"$ROOT_DIR/"}"
done

echo "  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}"
echo "  NEXT_PUBLIC_MEDUSA_REGION_ID=${REGION_ID}"
