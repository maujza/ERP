# Local development guide

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node 20 (to run services outside Docker)
- Git

## Working modes

### Mode A — full stack in Docker (recommended)

All services run in containers. No local Node needed for the backend or the storefront.

```bash
./scripts/compose-up.sh
```

Available services:

| Service | URL |
|---|---|
| Storefront | http://localhost:7358 |
| Backoffice / Admin | http://localhost:9000/app |
| Medusa API | http://localhost:9000 |
| POS web | http://localhost:8081 |
| PostgreSQL | localhost:5433 |

### Mode B — local services with the DB in Docker

Useful when actively developing on the backend or storefront and you want hot-reload.

```bash
# 1. Bring up only the database
docker compose up db -d

# 2. Backend (in one terminal)
cd backend
npm run dev        # loads .env → then .env.dev (local overrides)

# 3. Storefront (in another terminal)
cd storefront
npm run dev        # Next loads .env.development automatically
```

The storefront ends up at `http://localhost:3000`, the backend at `http://localhost:9000`.

---

## Initial setup (first time)

### 1. Copy the env files

```bash
cp backend/.env.example              backend/.env
cp backend/.env.dev.example          backend/.env.dev
cp storefront/.env.example           storefront/.env
cp storefront/.env.development.example  storefront/.env.development
```

### 2. Fill in `backend/.env`

| Variable | Description |
|---|---|
| `JWT_SECRET` | Any secret string |
| `COOKIE_SECRET` | Any secret string |
| `MEDUSA_ADMIN_PASSWORD` | Password for `admin@aurelia.com` |
| `R2_BUCKET`, `R2_*` | Cloudflare R2 credentials (ask whoever administers the bucket) |

Without `R2_BUCKET`, the backend still starts fine using Medusa's local file provider — images are saved to disk instead of R2.

### 3. Bring up the stack

```bash
./scripts/compose-up.sh
```

This runs migrations, bootstrap, and automatically syncs the API keys into `storefront/.env.development`.

---

## Env files

| File | When it's loaded |
|---|---|
| `backend/.env` | Always (base) |
| `backend/.env.dev` | Only with `npm run dev` — overrides CORS and `MEDUSA_ADMIN_URL` |
| `storefront/.env` | Docker build |
| `storefront/.env.development` | `npm run dev` — Next.js loads it automatically |

`backend/.env.dev` overrides with local values:

```bash
STORE_CORS=http://localhost:3000,http://localhost:7358,...
ADMIN_CORS=http://localhost:9000
MEDUSA_ADMIN_URL=http://localhost:9000
```

> R2 and Resend aren't overridden in dev — prod credentials get used locally too. To isolate them, add `R2_BUCKET=` and `RESEND_API_KEY=` to `backend/.env.dev`.

---

## Tests

```bash
# Backend — unit tests (no DB or network required)
cd backend && npm run test:unit

# Storefront — all tests (Vitest + jsdom, no network required)
cd storefront && npm run test:run

# Storefront — with coverage
cd storefront && npm run test:coverage
```

Baseline: **346 unit tests** in the backend, **743 tests** in the storefront.

---

## After a database rebuild

Every time the Postgres volume is destroyed, new keys are generated. The storefront needs them in its bundle.

```bash
# Resync (requires the stack to be running)
./scripts/sync-medusa-env.sh

# Rebuild the web container
docker compose up --build web -d
```

See [`docs/medusa-auth-keys.md`](./medusa-auth-keys.md) for detailed diagnostics.

---

## Selective rebuild

```bash
docker compose up --build web -d      # storefront only
docker compose up --build backend -d  # backend only
docker compose up --build -d          # everything
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Storefront shows 0 products | Stale publishable key / region | `sync-medusa-env.sh` + rebuild `web` |
| `R2 file provider: "bucket" option is required` | Empty `R2_BUCKET` | The backend still starts; fill it in if you need R2 |
| Changed `NEXT_PUBLIC_*` and it had no effect | Variable is baked in at build time | Rebuild `web` |
| Backend takes a long time to start | `backend-init` is running migrations | Wait for `Server is ready on port: 9000` |
| `MEDUSA_ADMIN_PASSWORD` warning in compose | Docker CLI evaluates before reading `env_file` | Cosmetic, ignore |

---

## Quick reference

```bash
./scripts/compose-up.sh              # bring up the stack
docker compose ps                    # service status
docker compose logs -f backend       # live backend logs
docker compose logs -f web           # live storefront logs
docker compose down                  # bring down (keeps the DB)
docker compose down -v               # bring down and destroy the DB
./scripts/sync-medusa-env.sh         # resync keys
```
