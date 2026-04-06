#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR="$ROOT_DIR/.deploy-state"
BACKEND_HASH_FILE="$STATE_DIR/backend.hash"
WEB_HASH_FILE="$STATE_DIR/web.hash"
POS_HASH_FILE="$STATE_DIR/pos.hash"

image_exists() {
  docker image inspect "$1" >/dev/null 2>&1
}

read_hash_file() {
  local file="$1"

  if [ -f "$file" ]; then
    cat "$file"
  fi
}

hash_targets() {
  if [ "$#" -eq 0 ]; then
    printf 'empty\n'
    return
  fi

  local entries=()
  local target

  for target in "$@"; do
    [ -e "$target" ] && entries+=("$target")
  done

  if [ "${#entries[@]}" -eq 0 ]; then
    printf 'empty\n'
    return
  fi

  find "${entries[@]}" -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | cut -d' ' -f1
}

hash_backend() {
  find backend \
    \( -path 'backend/node_modules' -o -path 'backend/.medusa' -o -path 'backend/dist' \) -prune \
    -o -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | cut -d' ' -f1
}

hash_pos() {
  find pos \
    \( -path 'pos/node_modules' -o -path 'pos/dist' -o -path 'pos/.expo' \) -prune \
    -o -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | cut -d' ' -f1
}

hash_web() {
  hash_targets \
    src \
    public \
    package.json \
    package-lock.json \
    next.config.ts \
    tsconfig.json \
    postcss.config.mjs \
    eslint.config.mjs \
    Dockerfile \
    .dockerignore \
    .env \
    .env.local
}

build_backend_images() {
  docker build -t erp-backend-init:local --target builder backend
  docker build -t erp-backend:local --target runner backend
}

build_web_image() {
  docker build -t erp-web:local .
}

build_pos_image() {
  docker build -t erp-pos:local -f pos/Dockerfile.web pos
}

mark_all_builds() {
  needs_web_build=true
  needs_backend_build=true
  needs_pos_build=true
}

needs_web_build=false
needs_backend_build=false
needs_pos_build=false

stored_backend_hash="$(read_hash_file "$BACKEND_HASH_FILE")"
stored_web_hash="$(read_hash_file "$WEB_HASH_FILE")"
stored_pos_hash="$(read_hash_file "$POS_HASH_FILE")"

current_backend_hash="$(hash_backend)"
current_pos_hash="$(hash_pos)"

if [ -z "$stored_backend_hash" ] || [ "$current_backend_hash" != "$stored_backend_hash" ]; then
  needs_backend_build=true
fi

if [ -z "$stored_pos_hash" ] || [ "$current_pos_hash" != "$stored_pos_hash" ]; then
  needs_pos_build=true
fi

if ! image_exists "erp-backend:local" || ! image_exists "erp-backend-init:local"; then
  needs_backend_build=true
fi

if ! image_exists "erp-pos:local"; then
  needs_pos_build=true
fi

echo "Starting database..."
docker compose up -d db

if [ "$needs_backend_build" = true ]; then
  echo "Building backend images..."
  build_backend_images
fi

echo "Running backend initialization..."
docker compose run --rm backend-init

echo "Syncing storefront env from database..."
"$ROOT_DIR/scripts/sync-medusa-env.sh"

current_web_hash="$(hash_web)"

if [ -z "$stored_web_hash" ] || [ "$current_web_hash" != "$stored_web_hash" ]; then
  needs_web_build=true
fi

if ! image_exists "erp-web:local"; then
  needs_web_build=true
fi

echo "Build plan:"
echo "  backend: $needs_backend_build"
echo "  web: $needs_web_build"
echo "  pos: $needs_pos_build"

if [ "$needs_pos_build" = true ]; then
  echo "Building POS image..."
  build_pos_image
fi

if [ "$needs_web_build" = true ]; then
  echo "Building web image..."
  build_web_image
fi

echo "Starting application services..."
docker compose up -d backend web pos

echo "Waiting for backend to be ready..."
for i in {1..120}; do
  if docker compose logs --tail=50 backend 2>/dev/null | grep -q "Server is ready on port: 9000"; then
    break
  fi
  sleep 2
  if [ "$i" -eq 120 ]; then
    echo "Backend did not become ready in time" >&2
    exit 1
  fi
done

mkdir -p "$STATE_DIR"
printf '%s\n' "$current_backend_hash" > "$BACKEND_HASH_FILE"
printf '%s\n' "$current_web_hash" > "$WEB_HASH_FILE"
printf '%s\n' "$current_pos_hash" > "$POS_HASH_FILE"

echo "Done."
echo "  Admin: http://localhost:9000/app"
echo "  Store: http://localhost:7358"
