#!/usr/bin/env bash
# promote-to-prod.sh — swap prod to an image tag already validated in staging.
#
# backend/backend-init/pos are pulled verbatim from the local registry
# (build-once-promote: the exact bytes tested in staging). web is rebuilt
# locally with prod's own storefront/.env (see CLAUDE.md: NEXT_PUBLIC_* is
# baked in per-environment, so the staging-flavored web image cannot be
# reused as-is) — same source SHA, different baked config.
#
# Before swapping, the currently-running images are tagged ":rollback" and the
# current tag is recorded as the previous-good SHA, so rollback-prod.sh can
# undo this exact promotion without rebuilding anything.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REGISTRY="${REGISTRY:-localhost:5000}"
TAG="${1:?usage: promote-to-prod.sh <tag>}"
STATE_DIR="$ROOT_DIR/.deploy-state"
LAST_GOOD_FILE="$STATE_DIR/last-good-sha"
PREVIOUS_GOOD_FILE="$STATE_DIR/previous-good-sha"

mkdir -p "$STATE_DIR"

echo "Preserving current images as rollback targets..."
for name in backend pos web; do
  if docker image inspect "erp-$name:local" >/dev/null 2>&1; then
    docker tag "erp-$name:local" "erp-$name:rollback"
  fi
done

if [ -f "$LAST_GOOD_FILE" ]; then
  cp "$LAST_GOOD_FILE" "$PREVIOUS_GOOD_FILE"
fi

echo "Pulling validated images for tag $TAG..."
for name in backend-init backend pos; do
  docker pull "$REGISTRY/erp-$name:$TAG"
  docker tag "$REGISTRY/erp-$name:$TAG" "erp-$name:local"
done

echo "Starting database (no-op if already running)..."
docker compose up -d db

# Migrations below are forward-only and rollback-prod.sh deliberately does
# not touch the database (see its header comment) — this is the only
# recovery point if a migration corrupts data or breaks the schema. Restore
# is manual (scripts/restore-db-backup.sh, docs/db-restore-runbook.md), never
# wired into the automatic rollback path: it would discard any real order/
# account written between this backup and a later failure.
echo "Backing up the database before migrating..."
BACKUP_DIR="$ROOT_DIR/.deploy-state/db-backups"
mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/medusa_${TAG}_$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose exec -T db pg_dump -U medusa -d medusa --clean --if-exists | gzip > "$backup_file"
echo "Backup written to $backup_file"

DB_BACKUP_RETENTION="$(sed -n 's/^DB_BACKUP_RETENTION=//p' "$ROOT_DIR/.env" 2>/dev/null | tail -1)"
DB_BACKUP_RETENTION="${DB_BACKUP_RETENTION:-10}"
ls -1t "$BACKUP_DIR"/medusa_*.sql.gz 2>/dev/null \
  | tail -n "+$((DB_BACKUP_RETENTION + 1))" \
  | xargs -r rm -f

echo "Running migrations and bootstrap against prod..."
docker compose run --rm backend-init

echo "Refreshing storefront/.env with prod's publishable key/region..."
"$ROOT_DIR/scripts/sync-medusa-env.sh"

echo "Building web for prod (same SHA, prod-flavored env)..."
docker build -t erp-web:local storefront/

echo "Swapping running containers..."
docker compose up -d backend pos web

printf '%s\n' "$TAG" > "$LAST_GOOD_FILE"
echo "Promoted $TAG to prod."
