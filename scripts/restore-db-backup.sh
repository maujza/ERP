#!/usr/bin/env bash
# restore-db-backup.sh — manual, deliberate restore from a pre-deploy backup
# created by promote-to-prod.sh. Never invoked automatically by the pipeline
# or by rollback-prod.sh — see docs/db-restore-runbook.md before running
# this, and only after confirming a migration actually corrupted data.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_FILE="${1:?usage: restore-db-backup.sh <path-to-backup.sql.gz>}"
[ -f "$BACKUP_FILE" ] || { echo "Backup file not found: $BACKUP_FILE" >&2; exit 1; }

echo "WARNING: this will overwrite the current production database with:"
echo "  $BACKUP_FILE"
echo "All data written after that backup was taken will be permanently lost."
read -r -p "Type 'restore' to continue: " confirm
[ "$confirm" = "restore" ] || { echo "Aborted."; exit 1; }

echo "Stopping backend (avoid writes during restore)..."
docker compose stop backend

echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U medusa -d medusa

echo "Restarting backend..."
docker compose up -d backend

echo "Restore complete. Verify the app before considering this done."
