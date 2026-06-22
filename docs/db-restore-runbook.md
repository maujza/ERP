# DB restore runbook

`scripts/promote-to-prod.sh` takes a backup of the production database right
before running migrations (see its comments). `scripts/rollback-prod.sh`
deliberately does **not** touch the database — Medusa migrations are
forward-only, and the previous app image isn't guaranteed to understand a
schema the new release already migrated. This runbook is what to do in the
case `rollback-prod.sh` explicitly punts on.

## Where backups live

`.deploy-state/db-backups/medusa_<TAG>_<UTC timestamp>.sql.gz` on the VPS,
one per promoted deploy. `<TAG>` is the short commit SHA that was being
promoted when the backup was taken — match it against deploy history to find
the backup from right before a specific release.

By default the last **10** backups are kept; older ones are pruned
automatically after each successful backup. To change that, set
`DB_BACKUP_RETENTION=<N>` in the VPS's root `.env` (the same file
`docker-compose.yml` already reads `MEDUSA_ADMIN_PASSWORD`/`SEED_DEMO_DATA`
from) — no Ansible change needed, it's read directly via `sed` at backup
time.

```bash
ls -lt .deploy-state/db-backups/
```

## When to restore — and when not to

Restoring discards **every** row written after the backup was taken —
including real customer orders, accounts, and payments placed between that
backup and whenever the problem was noticed. Only restore after confirming:

- A migration from the failed deploy actually corrupted data or broke the
  schema in a way the app can't tolerate (not just "the smoke test failed" —
  that can have unrelated causes, and `rollback-prod.sh` already handles the
  image-level rollback on its own).
- There's no better fix (e.g. a forward migration that repairs the damage
  without losing intervening writes).

This is why restore is a separate, manual script — never invoked by
`rollback-prod.sh` or by anything in `deploy.yml`. An automatic restore
triggered by a flaky smoke test would silently erase real orders with no
human in the loop.

## Restore procedure

1. Identify the right backup (see "Where backups live" above). Copy it
   somewhere safe if you want a fallback before proceeding.
2. On the VPS, from the repo root:
   ```bash
   ./scripts/restore-db-backup.sh .deploy-state/db-backups/medusa_<TAG>_<timestamp>.sql.gz
   ```
3. It prints a warning and asks you to type `restore` to confirm — this is
   the only safeguard, so make sure you're pointed at the right file before
   typing it.
4. It stops `backend` (to avoid writes racing the restore), restores via
   `psql` (the dump was taken with `--clean --if-exists`, so it drops and
   recreates objects itself — no manual `dropdb` needed), then restarts
   `backend`.
5. Verify before considering this resolved: admin login, the storefront
   catalog loads, and ideally a test order completes end-to-end.

## Why this isn't automated

Same reasoning as the warn-only Ansible drift-check in `deploy.yml`: an
action that's destructive and hard to reverse (here, permanent data loss for
real customer orders) should never fire without a human deciding it's the
right call for this specific incident.
