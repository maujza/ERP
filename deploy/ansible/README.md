# ERP — reproducible deployment (Ansible)

Idempotent provisioning of the full Aurelia ERP stack (Postgres + Medusa backend/admin
+ Next.js storefront + POS) on an Ubuntu VPS, served over real HTTPS via Nginx Proxy
Manager and the `*.gleeze.com` domains (see `docs/deploy.md` for the full production
architecture). Run from your laptop; only SSH is required on the target.

## What it does

1. **docker** — installs Docker Engine + Compose plugin (and git) from the official apt repo.
2. **firewall** — opens UFW for 22, the storefront port, and the backend port (the ports
   Nginx Proxy Manager forwards to over the shared `erp_platform` Docker network — not the
   public HTTPS port, which terminates in front of the VPS).
3. **app** — installs the GitHub deploy key, clones the repo, maps the storefront to the
   public port, and renders `backend/.env` + the root `.env` with the real domains
   (`storefront_origin`, `backend_url`, `pos_origin`) and secure-cookie setting.
4. **medusa** — bootstraps the DB (migrate/seed/admin), repairs admin credentials if
   needed, reads the publishable key, renders `storefront/.env`, brings the stack up via
   `scripts/compose-up.sh`, and verifies admin login + storefront respond.
5. **runner** — grants the GitHub Actions self-hosted runner user (`runner_user`, installed
   and registered manually — it's not part of this playbook) the ACLs it needs to drive
   deploys from `app_dir`, a separate copy of the deploy key (re-rendered from the same
   vault secret every run — not ACL-shared with root's own key, since git/ssh reject any
   private key with group/other bits regardless of whether the access is really scoped to a
   named ACL entry), read-only access to the rendered `.env` files, marks `app_dir` as a git
   `safe.directory` for that user, ensures the host-side npm/Playwright CI caches exist,
   installs `ansible-core` and a scoped sudoers rule so the CI drift-check below can run
   locally, and points the Docker daemon at the local registry as an insecure registry.
6. **backup** — installs WireGuard + rsync, renders and brings up a split-tunnel
   (`/etc/wireguard/wg0.conf`) into the operator's home LAN where the backup NAS lives, and
   installs a systemd timer (`erp-db-backup.timer`, cadence from `nas_backup_interval_hours`)
   that runs `scripts/backup-db.sh scheduled --offsite` to mirror DB backups off the VPS. See
   `docs/db-restore-runbook.md` for the full design and the manual one-time setup (WireGuard
   peer + Synology rsync account) this role assumes already exists.

Two non-obvious gotchas are codified here: the root `.env` (compose interpolates
`MEDUSA_ADMIN_PASSWORD`/`SEED_DEMO_DATA` from it, not `backend/.env`), and fetching the
publishable key **before** the storefront image is built (NEXT_PUBLIC_* are baked at build).

## Prerequisites (laptop)

```bash
pipx install ansible        # or: brew install ansible
```

## First-time setup

There is no pre-filled vault for "the current box" — `vault.yml.example` is a template with
placeholders, not real secrets. If the VPS is already running (hand-provisioned or from a
previous deploy), pull the real values out of what's actually on it instead of inventing new
ones — overwriting a live admin password/JWT secret/deploy key with a freshly-generated value
the first time you run this playbook will lock out whatever already depends on the old one:

```bash
# On the VPS, read the real values currently in use
cat /root/ERP/.env /root/ERP/backend/.env
# The deploy key in use: confirm with `ssh -vT git@github.com` which file under
# ~/.ssh authenticates successfully, then read that file's content
```

Then, on your laptop:

```bash
cd deploy/ansible
cp group_vars/all/vault.yml.example group_vars/all/vault.yml
# edit vault.yml, pasting in the real values gathered above
ansible-vault encrypt group_vars/all/vault.yml                 # choose a vault password; store it safely
```

Edit `inventory.ini` (target IP) and `group_vars/all/vars.yml` (`storefront_origin`,
`backend_url`, `pos_origin` for the public domains; `public_host`/ports stay local-only —
see the comments in `vars.yml`).

## Deploy / migrate

Always dry-run first against a live box — the first real reconciliation between this
playbook and a long-running VPS can surface meaningful drift (wrong CORS domains, wrong
`SEED_DEMO_DATA`, etc.) that you want to review before applying, not find out about after:

```bash
ansible-playbook site.yml --check --diff --ask-vault-pass
```

Then, once the diff looks right:

```bash
ansible-playbook site.yml --ask-vault-pass
```

To migrate to a **new instance**: point `aikirias/ERP -> Settings -> Deploy keys` at the
same key (already in the vault), change `ansible_host` in `inventory.ini`, `public_host` in
`vars.yml`, and re-point the `*.gleeze.com` domains (or `storefront_origin`/`backend_url`/
`pos_origin` if using different domains) at the new instance, then re-run the command above.

## Secrets

`group_vars/all/vault.yml` is gitignored (plaintext-safe). After `ansible-vault encrypt`
you may `git add -f group_vars/all/vault.yml` to commit the encrypted file, or keep it out
of git and store the vault password in a password manager. Editing later:
`ansible-vault edit group_vars/all/vault.yml`.

The CI drift-check (`.github/workflows/deploy.yml`, warn-only — see `CHANGELOG.md`) needs
the same vault content on the self-hosted runner, delivered via two GitHub Actions secrets
rather than committed to the repo: `ANSIBLE_VAULT_PASSWORD` (the password chosen above) and
`ANSIBLE_VAULT_FILE` (the full encrypted content of `vault.yml`, copy-pasted as-is).

## Notes

- Serves real HTTPS via Nginx Proxy Manager in front of the VPS — `vars.yml`'s
  `medusa_force_insecure_cookies` stays `false` to match. Only flip it to `true` if the
  stack is ever run without a TLS-terminating proxy in front of it (plain HTTP on the
  public IP), e.g. for a from-scratch instance before DNS/NPM are set up.
- R2 image storage is blank by default; fill `vault_r2_*` to enable product image uploads.
