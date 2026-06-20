#!/usr/bin/env bash
# rollback-prod.sh — revert prod to the image set running before the last
# promote-to-prod.sh call, using the ":rollback" tags it left behind. No
# rebuild, no migration is run — this only swaps containers back.
#
# Deliberately does NOT touch the database: Medusa migrations are forward-only
# and the old code is not guaranteed to understand a schema the new release
# may have migrated. If the failed deploy included a migration, swapping the
# binary back is not a full rollback — that case needs manual DB intervention.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR="$ROOT_DIR/.deploy-state"
LAST_GOOD_FILE="$STATE_DIR/last-good-sha"
PREVIOUS_GOOD_FILE="$STATE_DIR/previous-good-sha"

if [ ! -f "$PREVIOUS_GOOD_FILE" ]; then
  echo "No previous-good-sha recorded — nothing to roll back to." >&2
  exit 1
fi

previous_tag="$(cat "$PREVIOUS_GOOD_FILE")"

echo "Rolling back to previously-promoted tag: $previous_tag"

for name in backend pos web; do
  if ! docker image inspect "erp-$name:rollback" >/dev/null 2>&1; then
    echo "Missing erp-$name:rollback image — cannot roll back safely." >&2
    exit 1
  fi
  docker tag "erp-$name:rollback" "erp-$name:local"
done

docker compose up -d backend pos web

printf '%s\n' "$previous_tag" > "$LAST_GOOD_FILE"
echo "Rolled back to $previous_tag."
