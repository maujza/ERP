#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Synced into both: .env.development (local dev) and .env (baked into the
# Docker `web` image at build time, so a rebuild picks up fresh values too).
ENV_FILES=(
  "$ROOT_DIR/storefront/.env.development"
  "$ROOT_DIR/storefront/.env"
)

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if ! docker compose ps db >/dev/null 2>&1; then
  echo "db service is not available. Start compose first." >&2
  exit 1
fi

query_db() {
  local sql="$1"
  docker compose exec -T db psql -U medusa -d medusa -t -A -c "$sql" | tr -d '\r' | sed '/^$/d' | head -n1
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
  echo "Synced ${env_file#"$ROOT_DIR/"}"
done

echo "  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}"
echo "  NEXT_PUBLIC_MEDUSA_REGION_ID=${REGION_ID}"
