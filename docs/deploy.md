# Production deployment guide

## Production architecture

The application and the infrastructure run as separate Docker Compose
projects. Nginx Proxy Manager lives in
`infra/networking/nginx-proxy-manager/compose.yml` and publishes the ERP's
services over HTTP/HTTPS via the shared external network `erp_platform`.
Monitoring lives in `infra/monitoring/compose.yml` and runs as the
`erp-monitoring` project.

| Service | Domain |
|---|---|
| Storefront | https://aurorapormayor.com |
| Backoffice / Admin | https://backoffice.aurorapormayor.com |
| POS web | https://pos.aurorapormayor.com |
| Medusa API (backend) | https://backoffice.aurorapormayor.com (same server) |

---

## Automatic deploy

Every push to `main` (or a manual `workflow_dispatch`) triggers
`.github/workflows/deploy.yml`, which runs on the self-hosted runner (the
same VPS that serves prod) with build-once-promote:

1. **Build**: `backend`/`backend-init`/`pos` are built once (no env baked
   in) and pushed to the local registry (`scripts/ci-build-and-push.sh`).
2. **Validation in an ephemeral staging stack**: a separate stack is brought
   up (`docker-compose.staging.yml`, its own network/ports/DB) and
   migrations, backend integration tests, and Playwright e2e (admin +
   storefront) run against it. `web` is built with the *staging-flavored*
   `storefront/.env` (`NEXT_PUBLIC_*` is baked in at build time, which is why
   it's the only image built twice).
3. **Promote**: only if everything above passed, `scripts/promote-to-prod.sh`
   takes a backup of prod's DB, runs migrations against the real database,
   and swaps the containers to the already-validated images.
4. **Post-deploy validation**: `scripts/infra-healthcheck.sh` (Nginx,
   Grafana, Prometheus, Portainer, dashboards, alerts, targets, probes) and
   `scripts/production-smoke.sh` (Playwright against real prod).
5. If the post-deploy smoke test fails, `scripts/rollback-prod.sh` fires
   **automatically** and reverts the containers to the previously-promoted
   images (not the database — see "Manual rollback" below and
   `docs/db-restore-runbook.md`).

**To deploy**: merge a PR to `main` or push directly to `main`.

---

## Server setup (first time)

Provisioning a new VPS (or migrating to another one) is automated with
Ansible — see **`deploy/ansible/README.md`**: it clones the repo, renders
`backend/.env`/the root `.env`/`storefront/.env` from the vault, bootstraps
the DB, creates the admin, syncs keys, and brings up the stack via
`scripts/compose-up.sh`. Run `ansible-playbook site.yml --ask-vault-pass`
from your laptop, pointed at the server's IP in `inventory.ini`.

What Ansible does **not** automate yet (manual, one-time steps):

### 1. Configure Nginx Proxy Manager

The admin panel only listens on localhost. Open a tunnel from your local
machine:

```bash
ssh -L 8181:127.0.0.1:81 <user>@<vps>
```

Then go to `http://localhost:8181` and create these Proxy Hosts:

| Domain | Forward hostname | Forward port |
|---|---|---|
| `aurorapormayor.com` | `web` | `3000` |
| `backoffice.aurorapormayor.com` | `backend` | `9000` |
| `pos.aurorapormayor.com` | `pos` | `3000` |

For each host, request the SSL certificate from the panel and enable
`Force SSL`. The VPS's public ports are `80` and `443`; the internal
services stay bound to localhost.

### 2. Register the GitHub Actions runner

On the VPS, install the self-hosted runner following GitHub's official
guide: **Settings → Actions → Runners → New self-hosted runner**, picking
the architecture that matches the server. Once it's installed and
registered, `ansible-playbook site.yml` (the `runner` role) grants it the
permissions it needs to drive deploys (ACLs on the checkout, its own copy of
the deploy key, npm/Playwright caches), and installs the local `ansible-core`
+ scoped sudoers rule the next step needs.

The runner needs access to the repo directory and permission to run Docker.

### 3. Configure the Ansible vault secrets for the CI drift-check

`deploy.yml` runs a warn-only `ansible-playbook --check --diff` on every
deploy to catch infrastructure drift (see `CHANGELOG.md`). It needs the same
vault content the operator's laptop uses, delivered via two repo secrets
(**Settings → Secrets and variables → Actions → New repository secret**):

| Secret | Value |
|---|---|
| `ANSIBLE_VAULT_PASSWORD` | The vault password chosen in `deploy/ansible/README.md`'s first-time setup |
| `ANSIBLE_VAULT_FILE` | The full encrypted content of `deploy/ansible/group_vars/all/vault.yml` |

Both are written to a temp file on the runner only for the duration of that
one step, then deleted — never committed to the repo.

---

## Typical deploy flow

```
feature/xxx  →  PR to main  →  merge  →  GitHub Actions (deploy.yml)
  →  build + ephemeral staging + tests  →  promote-to-prod.sh  →  healthcheck + smoke
  →  (automatic rollback-prod.sh if the smoke test fails)
```

Only `web` is built twice (staging and prod have different `NEXT_PUBLIC_*`
values baked in at build time); everything else is built once and promoted
without rebuilding.

---

## Updating production credentials

`.env` files are gitignored — they aren't overwritten by `git pull`. Prod's
checkout on the VPS lives at `/root/ERP` (`DEPLOY_DIR` in `deploy.yml`), not
a dev laptop's path. To update:

```bash
# On the VPS
nano /root/ERP/backend/.env

# If a backend variable changed
docker compose up -d backend

# If a storefront NEXT_PUBLIC_* variable changed
docker compose up --build web -d
```

---

## After destroying the database volume

`scripts/promote-to-prod.sh` saves a backup (`.deploy-state/db-backups/`)
before every migration — that directory lives on the host filesystem, not
in the Docker volume (`postgres_data`), so it **survives** if the volume is
destroyed by mistake. Before reseeding from scratch, check whether there's a
recent backup: see `docs/db-restore-runbook.md`.

If there's genuinely no usable backup (or this is a new environment with no
data to recover):

```bash
cd /root/ERP
./scripts/compose-up.sh   # migrations + bootstrap + key sync
# Load the catalog manually from https://backoffice.aurorapormayor.com/app
```

---

## Basic monitoring

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web
docker compose --project-name erp-infra --env-file infra/.env \
  --file infra/networking/nginx-proxy-manager/compose.yml ps
curl https://backoffice.aurorapormayor.com/health
```

---

## Manual rollback

`deploy.yml` already triggers `scripts/rollback-prod.sh` **automatically**
if the post-deploy smoke test fails — this section is for the case where the
problem shows up later (CI was already green, but something breaks hours
afterward) and you need to roll back by hand.

`rollback-prod.sh` only reverts to the previously-promoted images
(`erp-*:rollback`, left behind by the last `promote-to-prod.sh` run) — no
`git reset`, no rebuilding anything, and it **deliberately doesn't touch the
database** (migrations are forward-only; the old code isn't guaranteed to
understand a schema the new release already migrated):

```bash
cd /root/ERP
./scripts/rollback-prod.sh
```

If the problem comes from a migration that corrupted data (not just the
app's code), an image rollback isn't enough — see
**`docs/db-restore-runbook.md`** for the manual database restore procedure,
deliberately kept separate from this step because it can mean losing real
data written after the backup.
