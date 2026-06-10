#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy-state"
ARTIFACTS_DIR="$ROOT_DIR/.artifacts/playwright-production"
HASH_FILE="$STATE_DIR/production-smoke.hash"
IMAGE_NAME="erp-production-smoke:local"

hash_smoke_targets() {
  find \
    "$ROOT_DIR/storefront/e2e/production" \
    "$ROOT_DIR/storefront/Dockerfile.production-smoke" \
    "$ROOT_DIR/storefront/playwright.production.config.ts" \
    -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | cut -d' ' -f1
}

current_hash="$(hash_smoke_targets)"
stored_hash=""

if [ -f "$HASH_FILE" ]; then
  stored_hash="$(cat "$HASH_FILE")"
fi

if [ "$current_hash" != "$stored_hash" ] \
  || ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  echo "Building production smoke test image..."
  docker build \
    --file "$ROOT_DIR/storefront/Dockerfile.production-smoke" \
    --tag "$IMAGE_NAME" \
    "$ROOT_DIR/storefront"

  mkdir -p "$STATE_DIR"
  printf '%s\n' "$current_hash" > "$HASH_FILE"
fi

rm -rf "$ARTIFACTS_DIR"
mkdir -p "$ARTIFACTS_DIR"

echo "Running production smoke tests..."
docker run --rm \
  --ipc=host \
  --env STOREFRONT_URL="${STOREFRONT_URL:-https://aurelia.gleeze.com}" \
  --env BACKEND_URL="${BACKEND_URL:-https://backoffice.aurelia.gleeze.com}" \
  --env POS_URL="${POS_URL:-https://pos.aurelia.gleeze.com}" \
  --env MEDUSA_PUBLISHABLE_KEY="$(sed -n 's/^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=//p' "$ROOT_DIR/storefront/.env")" \
  --volume "$ARTIFACTS_DIR:/artifacts" \
  "$IMAGE_NAME"
