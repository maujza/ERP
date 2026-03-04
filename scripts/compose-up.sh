#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting docker compose..."
docker compose up -d --build

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

echo "Syncing storefront env from database..."
"$ROOT_DIR/scripts/sync-medusa-env.sh"

echo "Recreating web service with synced env..."
docker compose up -d --force-recreate web

echo "Done."
echo "  Admin: http://localhost:9000/app"
echo "  Store: http://localhost:7358"
