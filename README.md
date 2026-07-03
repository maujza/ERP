# Aurora ERP Commerce Stack

Monorepo for Aurora's commerce operation. The stack combines a B2B storefront, a visual backoffice, a Medusa backend, POS, and a PostgreSQL database.

## What's included

- `storefront/`: storefront and backoffice in Next.js 16.
- `backend/`: Medusa v2 backend with seeds, migrations, and the custom `purchaseDepartment` module.
- `pos/`: Expo-based web/mobile POS.
- `docker-compose.yml`: local stack with `db`, `backend-init`, `backend`, `web`, and `pos`.
- `.devcontainer/`: reproducible VS Code/Codespaces development environment.
- `infra/`: independent infrastructure stacks, including Nginx Proxy Manager.
- `infra/monitoring/`: Prometheus, Grafana, Node Exporter, Telegraf, Blackbox Exporter, and Portainer.

## Documentation

- [Local development guide](docs/local-dev.md) — initial setup, working modes, tests, env files
- [Deployment guide](docs/deploy.md) — production, CI/CD pipeline, rollback
- [DB restore runbook](docs/db-restore-runbook.md) — when and how to restore a pre-deploy database backup
- [Medusa auth & keys](docs/medusa-auth-keys.md) — publishable key, JWT, post-rebuild diagnostics

## Local services

When the stack is up:

- Storefront: `http://localhost:7358`
- Medusa backoffice: `http://localhost:9000/app`
- Medusa API: `http://localhost:9000`
- POS web: `http://localhost:8081`
- PostgreSQL: `localhost:5433`

## Recommended bring-up

The right flow isn't `docker compose up` by hand, but:

```bash
./scripts/compose-up.sh
```

That script does the following:

1. brings up PostgreSQL
2. builds only the images that changed
3. runs `backend-init` for migrations and bootstrap
4. resyncs `storefront/.env.development` with the current publishable key + region
5. rebuilds `web` only if its fingerprint changed
6. brings up `backend`, `web`, and `pos`
7. brings up Nginx Proxy Manager from its own independent Compose project

## Devcontainer

For editor-based development with hot reload, open the repository in a devcontainer.
The container provides Node 22, Docker/Compose access through the host Docker
daemon, PostgreSQL client tooling, and VS Code extensions for TypeScript,
Tailwind, Docker, ESLint, Prettier, and Playwright.

On first create, `.devcontainer/post-create.sh` copies missing local env files
from the checked-in examples and runs `npm ci` in `backend/`, `storefront/`, and
`pos/`.

After the container is ready, use the hot-reload flow:

```bash
docker compose up db -d

cd backend
npm run dev

cd ../storefront
npm run dev
```

See [Local development guide](docs/local-dev.md) for POS, full-stack Docker, and
test commands.

## Selective rebuild

`./scripts/compose-up.sh` uses fingerprints saved under `.deploy-state/` to decide whether a rebuild is needed:

- `backend`
- `web`
- `pos`

That avoids unnecessary rebuilds even if the working tree has uncommitted local changes.

## Important storefront variables

The storefront depends on these variables in `storefront/.env` (Docker/prod) or `storefront/.env.development` (local dev):

- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_REGION_ID`
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SHIPPING_STANDARD_ARS`
- `NEXT_PUBLIC_SHIPPING_EXPRESS_ARS`

The Medusa API is no longer configured with a public client-side URL.
The storefront always uses the internal `/api/medusa` proxy, and Next
rewrites it server-side to `MEDUSA_INTERNAL_BACKEND_URL`.

`scripts/sync-medusa-env.sh` automatically updates:

- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_REGION_ID`
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE`

After changing a `NEXT_PUBLIC_*` variable, `web` needs to be rebuilt so Next bakes it into the bundle.

## Docker and builds

The repo no longer compiles the storefront or backend when containers start:

- `web` uses a Docker multi-stage build + `Next standalone`
- `backend` uses a Docker multi-stage build with a slimmed-down final image
- `backend-init` uses the `builder` target to run migrations and bootstrap

Observed sizes after the adjustment:

- `erp-web:local`: ~`296MB`
- `erp-backend:local`: ~`673MB`
- `erp-backend-init:local`: ~`895MB`
- `erp-pos:local`: ~`241MB`

## Seeds and bootstrap

Bootstrap runs in `backend/src/scripts/bootstrap.ts`.

It does two idempotent checks:

- if Medusa's base seed is missing, it runs it
- if the Argentina region is missing, it runs Aurora's seed

That avoids reseeding everything on every backend restart.

## Frontend development

The storefront lives under `src/` and mixes:

- an editorial home page
- a catalog with filters
- product pages
- checkout
- search
- a visual backoffice at `/backoffice`

Today, the catalog, search, and featured products load products client-side. That works, but it can show an empty initial state until it hydrates. A pending improvement is moving the initial product load to server-side rendering.

## Deployment

The CI/CD pipeline lives in `.github/workflows/deploy.yml`: build-once-promote with ephemeral staging validation, automatic promotion to prod, and automatic rollback on a failed post-deploy smoke test. See [`docs/deploy.md`](docs/deploy.md) for the full flow.

## Common issues

- Storefront with no products:
  usually a stale publishable key/region or an old `web` bundle.

- Changed `storefront/.env` and it had no effect:
  if you touched a `NEXT_PUBLIC_*` variable, rebuild `web`.

- The backend takes a long time on a cold start:
  the first `backend-init` run can take a while since it runs migrations and a full bootstrap.

- Disk I/O spikes during builds:
  the big cost is still the backend's first compilation; later runs should reuse the cache and skip rebuilding if nothing changed.

## Useful commands

```bash
./scripts/compose-up.sh
./scripts/production-smoke.sh
docker compose ps
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f pos
docker compose --project-name erp-infra --env-file infra/.env \
  --file infra/networking/nginx-proxy-manager/compose.yml ps
./scripts/sync-medusa-env.sh
```
