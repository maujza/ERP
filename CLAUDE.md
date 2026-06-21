# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aurelia is a bilingual (Spanish/Korean) jewelry e-commerce platform targeting the Argentine market. It is a monorepo with three main applications:

- **Frontend**: Next.js 16 App Router storefront + backoffice (`/storefront`)
- **Backend**: Medusa 2.x headless commerce (`/backend`)
- **POS**: Expo 54 / React Native point-of-sale app (`/pos`)

See [`docs/local-dev.md`](docs/local-dev.md) for setup and [`docs/deploy.md`](docs/deploy.md) for production.

## Commands

### Frontend (run from `storefront/`)

```bash
npm run dev          # local dev server (port 3000)
npm run build        # production build
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:coverage
```

### Backend (run from `/backend`)

```bash
npm run dev          # Medusa dev server (port 9000)
npm run build        # production build
npm run test:unit    # Jest unit tests (src/**/__tests__/**/*.unit.spec.ts)
npm run test:integration:modules
npm run test:integration:http
```

### Docker (full stack)

The recommended way to start the stack:

```bash
./scripts/compose-up.sh   # smart orchestration: selective rebuilds, migrations, env sync
```

Or individual rebuilds:

```bash
docker compose up --build web -d      # rebuild & restart frontend only
docker compose up --build backend -d  # rebuild & restart backend only
docker compose up --build -d          # rebuild everything
```

The full stack runs at: frontend → `localhost:7358`, backend → `localhost:9000`, POS → `localhost:8081`.

> **After a full `docker system prune --volumes`**: `docker-compose.yml` declares the `erp_platform` network as `external: true`, so a raw `docker compose up` fails with "network erp_platform declared as external, but could not be found" once prune removes it. `./scripts/compose-up.sh` recreates this network (and other infra resources) automatically before bringing up the stack — always use it as the entrypoint after a full prune.

> **Note**: The `web` service runs a production Next.js build (no hot reload). After frontend changes, rebuild the container. After changing any `NEXT_PUBLIC_*` env var, rebuild `web`.

## Architecture

### Frontend (`/src`)

- **App Router pages** in `src/app/` — routes include product pages, checkout, search, catalog, and account/auth.
  - **Checkout** (`src/app/checkout/`) — decomposed into focused sub-components:
    - `page.tsx` — orchestrates the full flow
    - `use-checkout.ts` — custom hook with state management
    - `contact-form.tsx`, `shipping-form.tsx`, `payment-method-picker.tsx` — form segments
    - `checkout-choice-modal.tsx`, `order-summary.tsx`, `field.tsx` — UI components
    - `types.ts`, `translations.ts` — types and i18n strings
- **Components** in `src/components/`:
  - `app-chrome.tsx` — main app shell (header, footer, cart drawer, toasts)
  - `cart-provider.tsx` — global cart state and cart context
  - `cart-drawer.tsx` — drawer UI for viewing cart
  - `product-card.tsx` — reusable product display component
  - `product-quick-view.tsx` — modal for quick product inspection
  - `quantity-selector.tsx` — quantity picker UI
  - `language-provider.tsx` — i18n context (es/ko)
  - `safe-image.tsx` — graceful image fallbacks
  - `toast-provider.tsx` / `toast-list.tsx` — toast notifications
- **Hooks** in `src/hooks/`:
  - `use-favorites.ts` — favorite products (localStorage)
  - `use-is-mobile.ts` — viewport detection
- **Medusa SDK** initialized in `src/lib/medusa.ts`. Uses the internal proxy `/api/medusa` (rewritten server-side via `MEDUSA_INTERNAL_BACKEND_URL` in `next.config.ts`); `NEXT_PUBLIC_MEDUSA_BACKEND_URL` falls back to `/api/medusa` if unset.
- **Product utilities** in `src/lib/shop-data.ts`: category definitions, Spanish/Korean label translations, ARS price formatting.
- **Path alias**: `@/` → `src/`.
- **Tests**: Vitest with jsdom; 579+ tests; setup clears localStorage before each test.

### Backend (`/backend/src`)

- **API routes**:
  - `api/admin/purchase/` — suppliers and purchase orders CRUD + lifecycle (submit/receive/cancel)
  - `api/admin/fulfillment/` — fulfillment lifecycle (pick/pack/dispatch) + KPIs
  - `api/admin/team-tasks/` — team task board CRUD
  - `api/admin/whatsapp-notifications/` — WhatsApp eligibility check
  - `api/store/` — storefront endpoints including order notifications
  - Following Medusa conventions with container DI pattern (`req.scope.resolve("serviceName")`)
- **Custom modules**:
  - `modules/purchaseDepartment/` — supplier, purchase order, and fulfillment management with write-time cached `fill_rate`
  - `modules/taskBoard/` — team task board (title, description, status, priority, area, assignee, due_date); model: `Task`; migration: `Migration20260406000001`
- **Workflows**:
  - `create-supplier`, `update-supplier` — supplier lifecycle
  - `receive-purchase-order`, `create-purchase-order` — PO management
  - `startPickingWorkflow`, `confirmPackWorkflow`, `dispatchOrderWorkflow` — fulfillment steps
- **Database models**: `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `FulfillmentRecord`, `StockAdjustmentLog` with proper migrations
- **Subscribers**:
  - `invite-created.ts` — sends invite email via Resend (`RESEND_API_KEY`, `RESEND_FROM`)
  - `low-stock-check.ts` — monitors stock levels
  - `order-placed.ts` — handles new order events
- **Jobs**: `packed-not-shipped.ts` — background job for order status monitoring
- **Utilities**:
  - `lib/rbac.ts` — role-based access control
  - `lib/notification-recipients.ts` — helper for WhatsApp notification eligibility
- **Seed scripts**:
  - `seed.ts` / `seed-aurelia.ts` — **infrastructure only by default**: sales channel, ARS currency, Argentina region, tax region, Buenos Aires stock location, shipping options, publishable key, admin role. No content (categories, collections, products, inventory, customers, orders) is seeded. Set `SEED_DEMO_DATA=true` to additionally seed the demo catalog (jewelry categories, collections, ~130 products, customers, orders, `AURELIA10` promo).
  - `seed-e2e.ts` / `cleanup-e2e.ts` — test-scoped catalog for the E2E suites (tagged `metadata.e2e`): creates categories, collections, products + inventory; the matching cleanup removes exactly those. Wired into both Playwright suites' `globalSetup`/`globalTeardown`.
  - `seed-demo-historic.ts` — demo data for testing
  - `cleanup-seeded-orders.ts` — cleanup utility
  - `reset-demo-data.ts` — reset utility
- **Custom admin UI** in `admin/routes/`:
  - `aurelia-dashboard/` — sales analytics dashboard
  - `purchase/` — purchase orders and suppliers UI
  - `fulfillment/` — fulfillment orders UI
  - `team-tasks/` — task board UI
  - `notifications/` — notification preferences
- **Tests**: Jest with 172+ unit tests; pattern: `*.unit.spec.ts` inside `__tests__/` directories

### File Storage (`backend/src/modules/image-upload/`)

Custom Medusa file provider that uploads product images to **Cloudflare R2** (S3-compatible). Sharp processes images before upload: anything >500 KB or >1400 px wide is resized to max 1400 px and converted to WebP at quality 82. GIFs and already-small images are uploaded as-is. Non-image uploads are rejected with a clear error. Configured via `R2_*` env vars; registered in `medusa-config.ts` under `@medusajs/medusa/file`.

### Medusa Config (`backend/medusa-config.ts`)

Auth uses `emailpass` for both customers and admin users. CORS origins are configured separately for store, admin, and auth endpoints.

### WhatsApp Feature

- `src/lib/whatsapp.ts` — link generation and draft persistence (localStorage).
- `backend/src/api/admin/whatsapp-notifications/route.ts` — RBAC check via `WHATSAPP_NOTIFICATION_RECIPIENTS` and `WHATSAPP_NOTIFICATION_ROLES` env vars.

## Key Conventions

- **Client components** marked with `"use client"` at the top.
- **Backoffice routing**: `isBackoffice` check in `SiteHeader` hides header on `/backoffice` routes.
- **Product images**: use `safe-image.tsx` for graceful fallbacks.
- **Pricing**: all prices display in ARS (Argentine Peso).
- **Medusa container DI**: API handlers use `req.scope.resolve("serviceName")`.
- **Backend testing**: Jest unit tests use `*.unit.spec.ts` inside `__tests__/` directories; module-level caches export `clearX()` functions called in `beforeEach`
- **Frontend testing**: Vitest with jsdom; setup at `src/test/setup.ts` clears localStorage before each test.
- **Immutability**: follow immutable data patterns (never mutate objects in-place).
- **Component organization**: files under 800 lines; extract utilities and reusable components.
- **i18n**: bilingual (Spanish/Korean) via `useLanguage` hook and `t` translation object; product metadata fields `name_ko`/`description_ko` for Korean names.

## Environment Variables

<!-- AUTO-GENERATED: Last updated from .env.example -->

**Frontend** (`storefront/.env` for Docker/prod + `storefront/.env.development` for local dev):
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — optional; defaults to `/api/medusa` (the internal proxy)
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — Medusa storefront publishable key (auto-synced by `scripts/sync-medusa-env.sh`)
- `NEXT_PUBLIC_MEDUSA_REGION_ID` — region identifier
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE` — country code (default: `"ar"`)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — WhatsApp business number for order notifications
- `NEXT_PUBLIC_SHIPPING_STANDARD_ARS` — standard shipping cost in ARS (e.g., 3900)
- `NEXT_PUBLIC_SHIPPING_EXPRESS_ARS` — express shipping cost in ARS (e.g., 7200)

**Backend** (`.env` or Docker env):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for JWT signing (required)
- `COOKIE_SECRET` — secret for session cookies (required)
- `MEDUSA_FORCE_INSECURE_COOKIES` — `true` for development (allows http cookies)
- `STORE_CORS` — comma-separated CORS origins for storefront
- `ADMIN_CORS` — comma-separated CORS origins for admin UI
- `AUTH_CORS` — comma-separated CORS origins for auth endpoints
- `MEDUSA_ADMIN_EMAIL` — admin user email (default: `admin@aurelia.com`)
- `MEDUSA_ADMIN_PASSWORD` — admin user password (required)
- `MEDUSA_ADMIN_URL` — admin UI URL (used in invite emails)
- `RESEND_API_KEY` — Resend API key for transactional email (invite-created subscriber)
- `RESEND_FROM` — sender address for Resend emails (e.g. `Aurelia <invitaciones@...>`)
- `WHATSAPP_NOTIFICATION_RECIPIENTS` — comma-separated admin emails eligible for WhatsApp notifications
- `WHATSAPP_NOTIFICATION_ROLES` — comma-separated roles eligible for WhatsApp notifications
- `R2_ACCOUNT_ID` — Cloudflare account ID
- `R2_ACCESS_KEY_ID` — R2 API token access key
- `R2_SECRET_ACCESS_KEY` — R2 API token secret key
- `R2_BUCKET` — R2 bucket name
- `R2_ENDPOINT` — R2 S3-compatible endpoint (`https://<account-id>.r2.cloudflarestorage.com`)
- `R2_PUBLIC_URL` — public URL for the bucket (enable "Public Development URL" in R2 settings)
- `SEED_DEMO_DATA` — `true` also seeds the demo catalog (categories, collections, products, inventory, customers, orders, promo) on startup; **unset/false (default) seeds infrastructure only** so the stack starts with an empty catalog (idempotent)

**Next.js server-side** (not `NEXT_PUBLIC_*`, not baked into bundle):
- `MEDUSA_INTERNAL_BACKEND_URL` — URL used by `next.config.ts` to rewrite `/api/medusa` requests server-side (defaults to `http://localhost:9000`)

<!-- AUTO-GENERATED END -->

## Commits, Pull Requests & Changelog

All commit messages, PR descriptions, CLAUDE.md content, and skills in this
repo are written in English, regardless of the language used in conversation.

### Commit messages — Conventional Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(<scope>): <description>
```

- `type`: `feat`, `fix`, `chore`, `refactor`, `perf`, `test`, `ci`, `docs`, `build`, `style`, `revert`.
- `scope` (optional): the area touched, e.g. `(storefront)`, `(backend)`, `(e2e)`, `(infra)`.
- `description`: imperative mood ("add", not "added"/"adds"), no trailing period.
- Use `!` after the type/scope (e.g. `feat(api)!:`) for breaking changes.
- A longer body explaining *why* (not just what) is encouraged for anything non-trivial — it's what tools like Repowise use to reconstruct decision rationale when no other record exists.

Example: `fix(e2e): narrow PUBLISHABLE_KEY type to unblock the web build`

### Pull request descriptions

Every PR description follows this structure (see `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Summary
- 1-3 bullets on what changed

## Why
The motivation or decision behind the change — not just what changed, but why this approach.

## Test plan
- [ ] How this was verified
```

The **Why** section matters most for non-trivial changes: it's the primary
signal Repowise indexes (via `CHANGELOG.md` and commit history) to answer
"why is this code shaped this way" in future sessions.

### Keeping CHANGELOG.md current

Before opening a PR with a non-trivial code or architecture change, add an
entry to `CHANGELOG.md` under a `## [Unreleased]` section at the top of the
file (create it if it doesn't exist yet), using the existing format:

```markdown
## [Unreleased]

### Added | Changed | Removed | Fixed
- **component/file**: what changed and *why* — not just a description of the diff.
```

When a release is cut, `[Unreleased]` is renamed to the real version + date
(matching the existing entries below it) — this doesn't change how versioning
already works, it just stops entries from being lost between PRs. Skip this
for trivial fixes (typos, formatting) — it's for changes worth explaining to
someone reading the project's history later.
