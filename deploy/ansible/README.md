# ERP — reproducible deployment (Ansible)

Idempotent provisioning of the full Aurelia ERP stack (Postgres + Medusa backend/admin
+ Next.js storefront + POS) on a clean Ubuntu VPS, over plain HTTP via its public IP.
Run from your laptop; only SSH is required on the target.

## What it does

1. **docker** — installs Docker Engine + Compose plugin (and git) from the official apt repo.
2. **firewall** — opens UFW for 22, the storefront port, and the backend port.
3. **app** — installs the GitHub deploy key, clones the repo, maps the storefront to the
   public port, and renders `backend/.env` + the root `.env`.
4. **medusa** — bootstraps the DB (migrate/seed/admin), repairs admin credentials if
   needed, reads the publishable key, renders `storefront/.env`, brings the stack up via
   `scripts/compose-up.sh`, and verifies admin login + storefront respond.

Two non-obvious gotchas are codified here: the root `.env` (compose interpolates
`MEDUSA_ADMIN_PASSWORD`/`SEED_DEMO_DATA` from it, not `backend/.env`), and fetching the
publishable key **before** the storefront image is built (NEXT_PUBLIC_* are baked at build).

## Prerequisites (laptop)

```bash
pipx install ansible        # or: brew install ansible
```

## First-time setup

```bash
cd deploy/ansible
cp group_vars/all/vault.yml.example group_vars/all/vault.yml   # already populated for the current box
ansible-vault encrypt group_vars/all/vault.yml                 # choose a vault password; store it safely
```

Edit `inventory.ini` (target IP) and `group_vars/all/vars.yml` (`public_host`, ports).

## Deploy / migrate

```bash
ansible-playbook site.yml --ask-vault-pass
```

To migrate to a **new instance**: point `aikirias/ERP -> Settings -> Deploy keys` at the
same key (already in the vault), change `ansible_host` in `inventory.ini` and `public_host`
in `vars.yml`, then re-run the command above.

## Secrets

`group_vars/all/vault.yml` is gitignored (plaintext-safe). After `ansible-vault encrypt`
you may `git add -f group_vars/all/vault.yml` to commit the encrypted file, or keep it out
of git and store the vault password in a password manager. Editing later:
`ansible-vault edit group_vars/all/vault.yml`.

## Notes

- Plain HTTP today (`MEDUSA_FORCE_INSECURE_COOKIES=true`). For HTTPS, front the stack with
  Caddy/nginx + a domain and flip that flag off.
- R2 image storage is blank by default; fill `vault_r2_*` to enable product image uploads.
