#!/usr/bin/env bash
# backup-db.sh <label> [--offsite] — dumps the production database into one
# of two independent, age-pruned pools, depending on how it's called:
#
#   no --offsite (promote-to-prod.sh, every deploy): writes to the "merge"
#   pool (.deploy-state/db-backups/), pruned to MERGE_BACKUP_RETENTION_DAYS.
#   Never touches the network — a merge to main must never depend on (or be
#   slowed by) the home NAS being reachable.
#
#   --offsite (the recurring systemd timer): writes to the "scheduled" pool
#   (.deploy-state/db-backups-nas/), pruned to NAS_BACKUP_RETENTION_DAYS,
#   then mirrors BOTH pools to their own subfolder on the NAS (rsync
#   --delete, scoped per-subfolder so neither pool's retention can delete
#   the other's files) over a WireGuard tunnel into the NAS's rsync daemon
#   account — not SSH, which is administrators-only on this NAS with no
#   per-user override. See docs/db-restore-runbook.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LABEL="${1:?usage: backup-db.sh <label> [--offsite]}"
OFFSITE=false
[ "${2:-}" = "--offsite" ] && OFFSITE=true

# sed, not `source`: RESEND_FROM's unquoted "<...>" value in these same
# files already broke a plain `source` once (see CHANGELOG.md).
env_get() { sed -n "s/^$1=//p" "$ROOT_DIR/.env" 2>/dev/null | tail -1; }
backend_env_get() { sed -n "s/^$1=//p" "$ROOT_DIR/backend/.env" 2>/dev/null | tail -1; }

dump_and_verify() {
  local backup_file="$1"
  docker compose exec -T db pg_dump -U medusa -d medusa --clean --if-exists | gzip > "$backup_file"
  if ! gzip -t "$backup_file" 2>/dev/null; then
    echo "Backup is corrupt (gzip integrity check failed): $backup_file" >&2
    rm -f "$backup_file"
    return 1
  fi
  echo "Backup written to $backup_file"
}

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

if [ "$OFFSITE" = false ]; then
  pool_dir="$ROOT_DIR/.deploy-state/db-backups"
  mkdir -p "$pool_dir"
  backup_file="$pool_dir/medusa_${LABEL}_${timestamp}.sql.gz"

  echo "Backing up the database (merge pool)..."
  dump_and_verify "$backup_file"

  retention="$(env_get MERGE_BACKUP_RETENTION_DAYS)"
  retention="${retention:-3}"
  find "$pool_dir" -name 'medusa_*.sql.gz' -mtime "+$retention" -delete

  exit 0
fi

scheduled_dir="$ROOT_DIR/.deploy-state/db-backups-nas"
mkdir -p "$scheduled_dir"
backup_file="$scheduled_dir/medusa_${LABEL}_${timestamp}.sql.gz"

echo "Backing up the database (scheduled pool)..."
dump_and_verify "$backup_file"

retention="$(env_get NAS_BACKUP_RETENTION_DAYS)"
retention="${retention:-10}"
find "$scheduled_dir" -name 'medusa_*.sql.gz' -mtime "+$retention" -delete

nas_host="$(env_get NAS_BACKUP_HOST)"
nas_module="$(env_get NAS_BACKUP_MODULE)"
nas_user="$(env_get NAS_BACKUP_USER)"
nas_password="$(backend_env_get NAS_BACKUP_RSYNC_PASSWORD)"

if [ -z "$nas_host" ] || [ -z "$nas_password" ]; then
  echo "NAS backup not configured (NAS_BACKUP_HOST/NAS_BACKUP_RSYNC_PASSWORD unset) — scheduled pool stays local-only." >&2
  exit 0
fi

merge_dir="$ROOT_DIR/.deploy-state/db-backups"
mkdir -p "$merge_dir"

export RSYNC_PASSWORD="$nas_password"

# --no-perms --no-owner --no-group: without these, rsync's default archive
# flags try to chgrp the destination to the source file's group, which the
# DSM rsync daemon rejects with "Operation not permitted" — the transfer
# itself still succeeds, but the command exits non-zero, which would mask a
# real failure behind a cosmetic one under `set -e`.
echo "Mirroring merge pool to the NAS..."
rsync -rt --no-perms --no-owner --no-group --delete \
  "$merge_dir/" "${nas_user}@${nas_host}::${nas_module}/merge/"

echo "Mirroring scheduled pool to the NAS..."
rsync -rt --no-perms --no-owner --no-group --delete \
  "$scheduled_dir/" "${nas_user}@${nas_host}::${nas_module}/scheduled/"

echo "Off-site backup complete."
