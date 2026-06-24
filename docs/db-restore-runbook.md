# DB restore runbook

`scripts/promote-to-prod.sh` takes a backup of the production database right
before running migrations (see its comments). `scripts/rollback-prod.sh`
deliberately does **not** touch the database — Medusa migrations are
forward-only, and the previous app image isn't guaranteed to understand a
schema the new release already migrated. This runbook is what to do in the
case `rollback-prod.sh` explicitly punts on.

## Where backups live

`scripts/backup-db.sh` (called by both `promote-to-prod.sh` and a recurring
systemd timer — see below) writes into one of two independent pools on the
VPS, never both, and prunes by file age rather than file count (the only
unit that stays meaningful regardless of how often a deploy happens or how
the scheduled interval changes):

| Pool | Written by | Retention var (root `.env`) | Mirrored to NAS? |
| --- | --- | --- | --- |
| `.deploy-state/db-backups/` ("merge") | every deploy (`promote-to-prod.sh`) | `MERGE_BACKUP_RETENTION_DAYS` (default 3) | yes, as a copy — see below |
| `.deploy-state/db-backups-nas/` ("scheduled") | the `erp-db-backup.timer` systemd timer, every `NAS_BACKUP_INTERVAL_HOURS` hours (default 6) | `NAS_BACKUP_RETENTION_DAYS` (default 10) | yes, newly generated here |

Filenames: `medusa_<label>_<UTC timestamp>.sql.gz`. For the merge pool,
`<label>` is the short commit SHA being promoted — match it against deploy
history to find the backup from right before a specific release. For the
scheduled pool, `<label>` is always `scheduled`.

The merge pool's `--offsite`-less dump never touches the network — a merge
to `main` must never depend on (or be slowed/blocked by) the home NAS being
reachable. Only the scheduled run (`--offsite`) talks to the network: it
mirrors **both** pools (`rsync --delete`, one subfolder per pool so neither
pool's retention can delete the other's files) over a WireGuard split-tunnel
into the operator's home LAN, landing on a Synology NAS via its native rsync
daemon account (`Control Panel -> File Services -> rsync` — not SSH, which
this NAS restricts to the `administrators` group with no per-user override).
See `deploy/ansible/roles/backup/` for the Ansible automation (WireGuard
tunnel + systemd timer) and `deploy/ansible/group_vars/all/vars.yml` for all
the tunable vars above.

Every dump is integrity-checked immediately after creation (`gzip -t`); a
corrupt dump is deleted and the script exits non-zero — which, called from
`promote-to-prod.sh` under `set -euo pipefail`, aborts the deploy rather than
proceeding without a trustworthy pre-migration backup. Any failure in
`backup-db.sh` (corrupt dump, `pg_dump` itself failing, the NAS mirror
failing) also sends a mail via Resend to `BACKUP_ALERT_EMAIL` (root `.env`)
— see `notify_failure` in the script.

```bash
ls -lt .deploy-state/db-backups/        # merge pool (on the VPS)
ls -lt .deploy-state/db-backups-nas/    # scheduled pool (on the VPS)
# On the NAS, both pools also live under the rsync module's merge/ and
# scheduled/ subfolders — useful if the VPS itself is the thing that's lost.
```

### Manual one-time setup (WireGuard peer + NAS rsync account)

The Ansible `backup` role assumes both of these already exist — it doesn't
create them, since they live outside this repo (the home WireGuard server's
admin panel and the NAS's own DSM):

1. Add the VPS as a peer on the home WireGuard server (e.g. `wg-easy`),
   using a **split tunnel**: `AllowedIPs` scoped to the tunnel subnet and the
   home LAN only (e.g. `10.8.0.0/24,192.168.0.0/24`) — never `0.0.0.0/0`,
   which would route the VPS's own production traffic through the home
   connection.
2. On the NAS (Synology DSM): `Control Panel -> File Services -> rsync` ->
   enable the rsync service and a dedicated rsync account (not the same as
   any DSM user/admin login) scoped to a shared folder reserved for backups.
3. Put the resulting secrets in `vault.yml`: `vault_wg_vps_private_key`,
   `vault_wg_home_peer_public_key`, `vault_wg_preshared_key`,
   `vault_wg_endpoint`, `vault_nas_backup_rsync_password`. Put the non-secret
   connection details (`nas_backup_host`, `nas_backup_module`,
   `nas_backup_user`, `wg_vps_tunnel_address`, `wg_allowed_ips`) in
   `vars.yml`.

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

## After restoring: reconcile what the database doesn't know about

A restore only changes what's in Postgres. Two classes of real-world state
can be out of sync with the now-reverted database, and need manual review —
this is the actual reason restoring is risky beyond "lost rows":

- **Physical fulfillment already happened.** If an order was picked, packed,
  or dispatched (`backend/src/workflows/steps/generate-pick-list.ts`,
  `dispatch-order.ts`) or a purchase order was received into stock
  (`receive-purchase-order.ts`) after the backup point, restoring puts that
  order/PO back to an earlier status in the database — but the package may
  already be with the courier, or the stock may already be on a shelf. Check
  fulfillment/purchasing activity between the backup timestamp and the
  restore for anything that needs manual correction (re-marking as shipped,
  adjusting stock counts) instead of letting the app's normal flow try to
  redo something that already physically happened.
- **Customers already got notified.** Order-confirmation
  (`backend/src/subscribers/order-placed.ts`) and WhatsApp/agent
  notifications (`backend/src/api/store/notify-agent/route.ts`) for any order
  placed after the backup point already went out before the restore erased
  that order from the database. Those customers need a manual, human
  follow-up — the system has no record to act on afterward.

Cross-check the backup timestamp against order/fulfillment activity in that
window before considering the incident closed, not just "the app loads
again."

## Why this isn't automated

Same reasoning as the warn-only Ansible drift-check in `deploy.yml`: an
action that's destructive and hard to reverse (here, permanent data loss for
real customer orders) should never fire without a human deciding it's the
right call for this specific incident.
