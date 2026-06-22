# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **CI/CD pipeline** (`.github/workflows/pr-checks.yml`, `.github/workflows/deploy.yml`): replaced the deploy-on-the-same-host-as-prod flow with build-once-promote — images are built and pushed to a local Docker registry (`infra/registry/`), validated end-to-end in an ephemeral, resource-capped staging stack (`docker-compose.staging.yml`, its own ports/network/volumes) running migrations, integration tests, and Playwright e2e, and only then promoted to prod (`scripts/promote-to-prod.sh`). A failed post-deploy smoke check triggers an automatic rollback (`scripts/rollback-prod.sh`) to the previously-promoted images. Added a `pr-checks.yml` workflow (lint + unit tests) as a required gate before merging to `main`, where none existed before.
- **`.github/PULL_REQUEST_TEMPLATE.md`** and a Conventional Commits / changelog convention documented in `CLAUDE.md`, so future decisions are easier to recover (used by Repowise's decision archaeology).
- **`deploy/ansible/roles/runner/`**: codifies the manual VPS setup the new CI/CD pipeline needed (ACLs granting the runner user access to `app_dir` and the deploy key, its SSH config, git `safe.directory`, npm/Playwright CI caches, and the Docker daemon's `insecure-registries` entry) so a rebuilt or migrated box doesn't silently lose access the pipeline depends on. Documented alongside two new `CLAUDE.md` conventions: add a regression test with every bugfix, and reflect manual server changes in Ansible in the same PR.
- **CLAUDE.md**: added a "Keeping Repowise current" convention — run `repowise update` after pushing a change (free, index-only: refreshes the dependency graph, git history, and CHANGELOG-derived decision records) so `get_why`/`get_risk`/`get_context` don't answer from a stale snapshot. `--docs` (LLM-backed page regeneration) is called out as a deliberate, token-costing action, not a default.

### Fixed
- **`storefront/e2e/_customer.ts`**: `PUBLISHABLE_KEY` typed as `string` (was `string | undefined`) — `next build` type-checks `e2e/` since `tsconfig.json` doesn't exclude it, and the old module-level throw guard wasn't narrowed across the functions declared later in the file. This blocked every `web` image rebuild, not just CI.
- **`storefront/src/app/checkout/__tests__/page.ui.test.tsx`**: updated step assertions for the 3-step checkout flow (shipping method is no longer its own step) — stale since the checkout refactor, never caught because no workflow ran storefront unit tests before `pr-checks.yml`.
- **.github/workflows/deploy.yml**: "Build and push web (staging-flavored env)" step was missing the `IMAGE_TAG` env var that every other step touching `docker-compose.staging.yml` sets — `sync-medusa-env.sh --project erp-staging` failed to parse the compose file (`IMAGE_TAG` is a required interpolation for `backend`/`backend-init`/`web`/`pos`), surfacing as the misleading "db service is not available" error even though the staging `db` container was healthy
- **.github/workflows/deploy.yml**: "Backend integration tests against staging" step only set `DATABASE_URL`, but `@medusajs/test-utils`' `MedusaTestRunner` (used by every `integration-tests/http/*.spec.ts` suite) creates/drops its temp database via `pg-god`, which reads the split `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD` vars instead — left unset, it defaulted to Postgres' default port 5432 (nothing listening there) instead of staging's `5532`, failing every HTTP integration suite with "Error initializing database"
- **.github/workflows/deploy.yml**: "Backend admin e2e" and "Storefront e2e" steps logged in with the e2e suites' fallback credentials (`admin@aurelia.com` / `supersecret`), but the staging admin user was actually created by `backend-init` using `MEDUSA_ADMIN_EMAIL`/`MEDUSA_ADMIN_PASSWORD` from `backend/.env` — a different real secret, not the fallback. Both steps now grep those two values out of `backend/.env` and forward them as `ADMIN_EMAIL`/`ADMIN_PASSWORD`, the names the e2e suites actually read.
- **.github/workflows/deploy.yml**: the e2e steps' first attempt at reading `backend/.env` used `source`, which failed with a bash syntax error — `.env` files follow dotenv-style parsing, not POSIX shell syntax, and `RESEND_FROM`'s unquoted "Aurelia &lt;invitaciones@...&gt;" value is parsed by bash as redirection. A second attempt (`grep`/`cut` on the host) avoided that, but admin login still failed in staging even though `backend-init`'s logs confirmed the user was created successfully. Replaced with `docker run --env-file backend/.env` — the same dotenv-style parser `docker-compose.staging.yml` itself uses to create the user — remapping `MEDUSA_ADMIN_EMAIL`/`MEDUSA_ADMIN_PASSWORD` to `ADMIN_EMAIL`/`ADMIN_PASSWORD` inside the container, guaranteeing both sides parse the same file the same way.
- **.github/workflows/deploy.yml**: admin e2e login kept failing even with the credential-passing fix above, because a `workflow_dispatch` run cancelled mid-flight while iterating on these fixes skipped "Tear down staging" (`down -v`) — `docker-compose.staging.yml` declares no named volume for `db`, but the cancelled run's anonymous volume survived and got reused by the next run's `up -d db`, carrying over an admin user/password from an earlier, unrelated test attempt. Added a defensive "Clean up any leftover staging stack from a previous run" step (`down -v --remove-orphans`) right after the checkout, so every run starts from a guaranteed-empty database regardless of how the previous run ended.
- **docker-compose.staging.yml**: admin e2e login still failed even against a clean database with correct credentials — `backend/.env` is tuned for prod, which serves over real HTTPS (`MEDUSA_FORCE_INSECURE_COOKIES=false`), but staging serves over plain HTTP on `127.0.0.1`. The login response's auth cookie came back `Secure`-flagged, which browsers silently drop on a non-HTTPS origin, bouncing every authenticated request back to `/app/login` regardless of how correct the submitted credentials were. Added an `environment` override on the staging `backend` service forcing `MEDUSA_FORCE_INSECURE_COOKIES=true`, without touching the real `backend/.env`.
- **.github/workflows/deploy.yml**: with login fixed, "Storefront e2e against staging" failed ~20 specs with no products visible anywhere (catalog, home, cart, checkout) even though `seed-e2e.ts` logged successful creation. Root cause not yet confirmed — the pipeline never captured the `web` service's own container logs, where a `[medusa-env]` stale-key warning or a proxy/rewrite error would actually show up. Added a "Dump staging container logs (on failure)" step (`docker compose logs backend`/`web`) right before teardown, so the next failure carries direct evidence instead of requiring a live manual repro.
- **scripts/sync-medusa-env.sh**: confirmed via a Playwright trace's browser console — every store API call from the staging storefront was being blocked by CORS, because it was calling `https://backoffice.aurelia.gleeze.com` (prod's real domain) directly instead of staging's own backend. `storefront/.env` is the same physical file prod uses, where `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is intentionally pinned to that absolute prod URL — this script only ever updated the publishable key/region/country vars, never touching that one, so staging builds silently inherited it. Now clears `NEXT_PUBLIC_MEDUSA_BACKEND_URL` when run with `--project` (staging only), falling back to the relative `/api/medusa` proxy (same-origin, no CORS) per `src/lib/medusa.ts`'s own fallback logic; the default (prod) path is untouched.
- **scripts/sync-medusa-env.sh**: with CORS fixed, the storefront's `/api/medusa` proxy itself failed with `ECONNREFUSED 127.0.0.1:9000` — `next.config.ts`'s `rewrites()` resolves `MEDUSA_INTERNAL_BACKEND_URL` into `routes-manifest.json` at Next.js **build time**, not at container startup, so `docker-compose.staging.yml`'s runtime-only `environment: MEDUSA_INTERNAL_BACKEND_URL: http://backend:9000` override never took effect — the build fell back to `next.config.ts`'s own default (`http://localhost:9000`), which doesn't resolve to anything inside the `web` container. Prod never hit this because it bypasses the proxy entirely via the absolute `NEXT_PUBLIC_MEDUSA_BACKEND_URL`. Now writes `MEDUSA_INTERNAL_BACKEND_URL=http://backend:9000` into `storefront/.env` itself when run with `--project` (staging only, same gate as the fix above), so it's available at build time; `promote-to-prod.sh` calls this script with no `--project` flag, so prod's build path is unaffected.
- **storefront/e2e/_customer.ts** / **.github/workflows/deploy.yml**: `account.spec.ts`'s second test (login as an API-provisioned customer) defaulted `BACKEND_URL` to `http://localhost:9000` for its direct admin/store API calls. On the self-hosted runner that port is prod's own backend (`docker-compose.yml`'s `127.0.0.1:9000:9000`), not staging's (`9100`) — `deploy.yml`'s "Storefront e2e against staging" step only set `BASE_URL` (the browser's target), never `BACKEND_URL`, so the test silently created/captured/delivered a real order and customer in prod via prod's real admin credentials, then cleaned them up in `afterEach` (same wrong URL), before failing because the *browser* login (against staging, which never saw that customer) couldn't find the account. Removed the dangerous fallback — `BACKEND_URL` is now required and throws if unset — and added `-e BACKEND_URL=http://127.0.0.1:9100` to the workflow step so the helper points at staging like the browser does.
- **docker-compose.staging.yml** / **.github/workflows/deploy.yml**: the `BACKEND_URL` incident above was possible because the 3 ad-hoc `docker run` test containers used `--network host` (chosen in `bef739f` purely so they could reach staging's host-bound ports via `localhost`, without needing the job to know Compose's internal network — a convenience choice, not a deliberate decision to share the host's network with prod). That meant any wrong default — not just the one already found — could silently reach whatever's listening on the real host ports, including prod on this same self-hosted runner. `docker-compose.staging.yml` now declares its network explicitly (`networks.default.name: erp-staging-net`) instead of relying on Compose's implicit `<project>_default` naming, and the 3 `docker run` steps join it (`--network "$STAGING_NETWORK"`) instead of the host's, addressing services by name (`db:5432`, `backend:9000`, `web:3000`) instead of `localhost:<host-port>` — a missing/wrong var now fails with `ECONNREFUSED`/DNS error instead of silently hitting prod, because there's no network path to prod's ports from inside that network at all. Also removed the same dangerous `|| "http://localhost:9000"` / `|| "http://localhost:7358"` fallbacks from `backend/e2e/playwright.config.ts` and `storefront/playwright.config.ts` (same class of landmine, previously inert only because `deploy.yml` always overrode them by hand).
- **storefront/e2e/_customer.ts** / **.github/workflows/deploy.yml**: with the above fixed, "Storefront e2e against staging" failed `registerCustomerApi` with `400 "A valid publishable key is required"` — `_customer.ts`'s publishable-key fallback (`readDevEnvVar`) reads `storefront/.env.development`, but `sync-medusa-env.sh --project erp-staging` only ever writes `storefront/.env`, so the helper sent whatever stale key was left in `.env.development` from an earlier checkout (likely prod's), which staging's freshly-bootstrapped database had never seen. Added `--env-file storefront/.env` to the "Storefront e2e against staging" step so the container gets the just-synced `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` directly.
- **.github/workflows/deploy.yml**: "Backend integration tests against staging" still failed on `$STAGING_NETWORK` even though DNS/raw TCP/`pg.Client` connect+create-database all worked instantly from a manual repro inside the exact same container — `@medusajs/test-utils`' `MedusaTestRunner` (`inApp: true`, used by every `integration-tests/http/*.spec.ts` suite) hung for 60s twice (`KnexTimeoutError`) on every single spec file booting its own in-process Medusa app, then died at its 180s hook timeout. Root cause not fully isolated (likely the full app's many simultaneous module connection pools behaving differently under a custom bridge network than under host networking, unlike a single ad-hoc connection) — confirmed via A/B test that reverting only this one step to `--network host` (kept on staging's own host-published db port `5532`, distinct from prod's `5433`) fixes it. This step makes no HTTP calls (no `BACKEND_URL`/`ADMIN_BASE_URL` involved, unlike the incident above), so the residual risk of sharing the host network is low; left as the one exception to the network isolation, documented in place. "Backend admin e2e" and "Storefront e2e" (which hit the already-running staging backend over HTTP instead of booting their own in-process app) stayed on `$STAGING_NETWORK` and passed cleanly, confirming the isolation itself isn't the problem in general.
- **scripts/infra-healthcheck.sh**: on the first-ever successful "Promote validated images to prod", the blackbox-probe check failed immediately after `promote-to-prod.sh` restarted `backend`/`web`/`pos` — even though prod was actually healthy seconds later (manually confirmed: all three endpoints `200`, containers up). Every other check in this script retries (`wait_for_url`'s 120s budget, the Grafana alert-evaluation loop's 60s budget), but the `probe_success` query was a single one-shot `curl` — Prometheus's blackbox_exporter only re-probes every `scrape_interval` (15s, `infra/monitoring/configs/prometheus/prometheus.yml`), so querying right after a promote-induced restart can read the stale pre-restart sample. Wrapped the probe fetch+validation in the same retry pattern as the rest of the script (20 attempts, 3s apart) instead of failing on a single momentary snapshot.

### Changed
- **`storefront/eslint.config.mjs`**: downgraded `react-hooks/set-state-in-effect` to `warn` — 5 pre-existing call sites are legitimate SSR-sync patterns (window/matchMedia on mount, state resets on dependency change), not bugs, but this is the first time lint has run in CI.

## [0.2.3.0] - 2026-04-19

### Changed
- **backend/package.json**: renamed package from `medusa-starter-default` → `aurelia-backend`; updated author, description, and keywords to reflect Aurelia/Argentina
- **seed.ts**: renamed default demo products from "Medusa T-Shirt/Sweatshirt/Sweatpants/Shorts" → "Aurelia ..."
- **seed-aurelia.ts**: fresh-install currency default changed from EUR+USD+ARS → ARS only (correct for Argentine market)
- **bootstrap.ts**: cleaned up log messages that referenced "Medusa" as a brand
- **fulfillment/orders/page.tsx**: renamed React Query cache key `medusa-orders-fulfillable` → `aurelia-orders-fulfillable`

### Added
- **patch-dashboard-i18n.mjs**: now patches the compiled Medusa dashboard dist to set `fallbackLng: "es"` so the admin UI defaults to Spanish for all users regardless of browser language. Wrapped in try/catch for read-only `node_modules` environments (prod Docker). Added no-match warning for future dashboard version upgrades.
- **backend/package.json** `postinstall` hook: ensures the i18n patch re-applies after every `npm install`
- **backend/package.json** `build` script: runs i18n patch before `medusa build` so the Spanish default is baked into the admin assets

## [0.2.2.0] - 2026-04-19

### Added
- **TEST-PLAN.md**: rewrote from scratch — removed stale branch reference, added `taskBoard`/`team-tasks` coverage, `invite-created` (Resend) subscriber cases, and concurrency/edge-case scenarios
- **backend/.env.template**: unblocked from `.gitignore` (was swallowed by `.env*` pattern) so it can now be committed and shared with new devs

### Changed
- **CLAUDE.md**: added `pos/` (Expo 54) as third monorepo application; documented `taskBoard` module; expanded API route list to include `team-tasks`; added `invite-created` subscriber (Resend); corrected Medusa SDK env var note (uses `/api/medusa` proxy); added `MEDUSA_INTERNAL_BACKEND_URL`; replaced `SENDGRID_*` with `RESEND_*`; added `./scripts/compose-up.sh` as recommended startup command
- **README.md**: fixed three hardcoded absolute paths (`/home/akwiek/code/ERP/...`) that would break on any machine other than the one that wrote them
- **VERSION**: bumped `0.2.1.1` → `0.2.2.0` to reflect taskBoard module, Resend migration, and post-Sprint-2.5 work

### Removed
- **TODOS.md**: deleted — stale sprint planning document last updated 2026-03-24; current sprint state lives in git history and task board

## [0.2.1.1] - 2026-03-24

### Fixed
- **Add-to-cart icon stroke color**: changed from `currentColor` to `white` to match design token `--card-btn-add-icon: #ffffff`; icon was invisible when inherited text color was dark

## [0.2.1.0] - 2026-03-24

### Added
- **Hover-card UX for product cards** (sprint 2.5): on desktop hover, product cards now reveal animated action buttons (add-to-cart circle link + quick-view circle button) that slide up from the bottom of the image
- **Favorites heart button**: every product card has a heart toggle (always visible on mobile, appears on hover on desktop) persisted to `localStorage` via the new `useFavorites` hook
- **`useFavorites` hook** (`src/hooks/use-favorites.ts`): lazy-initialized from localStorage with type validation, immutable state updates, and `console.warn` on write failures
- **`useIsMobile` hook** (`src/hooks/use-is-mobile.ts`): MediaQueryList-based mobile detection; hover buttons are SSR-safe (excluded from DOM on mobile, no hydration mismatch)
- **`variant` prop on `ProductCard`**: `"catalog"` (default, `h-52` image) vs `"featured"` (`h-64` image) — enables differentiated grid layouts
- **`renderTrigger` prop on `ProductQuickView`**: custom trigger pattern for embedding the modal in third-party button styles without coupling to the default eye-icon

### Changed
- `ProductCard` no longer renders a permanent add-to-cart button bar below the image; hover actions replace it per DESIGN.md principle: "interaction is earned, not announced"
- `addToCartLabel` prop removed from `ProductCard` (no longer needed); callers updated in `page.tsx`, `catalog/page.tsx`, and `search/page.tsx`
- Image zoom effect (`scale-105`) added on hover via Tailwind `group-hover` — images breathe without layout shift (overflow hidden on container)
- Discount badge repositioned: moved from below price to absolute top-left corner of the image area
- CSS custom properties for card hover buttons added to `globals.css`: `--card-btn-add`, `--card-btn-qv`, and their icon counterparts

### Fixed
- **Favorites flicker**: `useFavorites` now uses a lazy `useState` initializer (reads localStorage on first render) — eliminates the unfilled → filled flash for favorited products on page load
- **localStorage type safety**: `readFavorites()` validates that parsed data is `string[]` before trusting it; corrupt or tampered data falls back to `[]`

## [0.2.0.0] - 2026-03-23

### Added
- **Warehouse fulfillment lifecycle**: pick → pack → dispatch workflow (`startPickingWorkflow`, `confirmPackWorkflow`, `dispatchOrderWorkflow`) with full audit trail via `FulfillmentRecord` and `StockAdjustmentLog`
- **Supplier fill-rate caching**: `fill_rate` is written at PO receipt time (`Migration20260322000001`) and read back as a single column — no expensive recalculation on every GET; `backfill-supplier-fill-rate.ts` script for existing records
- **Low-stock subscriber** (`low-stock-check.ts`): triggers after every PO receipt and flags variants below threshold
- **Packed-not-shipped background job** (`packed-not-shipped.ts`): scheduled job that alerts on orders sitting in `packed` state too long
- **KPI dashboard tiles** (`/admin/fulfillment/kpis`): fill rate, dispatch rate, pack accuracy aggregated from `FulfillmentRecord`
- **WhatsApp notification eligibility** (`/api/admin/whatsapp-notifications`): RBAC-gated route returning recipients configured via `WHATSAPP_NOTIFICATION_RECIPIENTS`
- **`/api/store/notify-agent` storefront endpoint**: initiates order-placed WhatsApp notification flow
- **Medusa env validation** (`validateMedusaEnv()`): runs at Next.js startup and warns in logs when `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` or `NEXT_PUBLIC_MEDUSA_REGION_ID` are missing or have unexpected format — catches stale keys after DB rebuilds before the first request fails
- **`docs/medusa-auth-keys.md`**: documents publishable key lifecycle, JWT auth flow, stale-key refresh procedure, and quick diagnostic commands
- **`backend/src/scripts/validate-env.ts`**: `npx medusa exec` script that validates publishable key, region ID, and admin user against the live DB
- **i18n parity**: `/account`, `/auth`, and `/order-confirmation` pages fully bilingual (es/ko); `getProductName`/`getProductDescription` now language-aware via `metadata.name_ko`/`metadata.description_ko`
- 346 backend unit tests (up from 172); 712 frontend tests (up from 545) — added coverage for `buildTracking`, `QuantitySelector`, `CartDrawer`, `LanguageToggle`, backend RBAC branches, `notify-agent` rate-limit paths, and `low-stock-check` edge cases

### Changed
- **Header nav**: language toggle moved from desktop nav bar into the hamburger drawer (consistent across all screen sizes); "Finalizar compra" merges into the cart slot as a morphing pill on md+ — zero layout shift when cart state changes
- **MobileStickyCheckout** bottom bar: fixed invisible text bug (`<Link>` with `flex` didn't auto-stretch; `text-white` now on child `<span>` elements, bypassing `a { color: inherit }` global override)
- **Checkout decomposed** (`checkout/page.tsx` 1043 lines → `useCheckout` hook + 6 sub-components + `types.ts` + `translations.ts`)
- **Frontend component library**: `ProductCard`, `QuantitySelector`, `CartDrawer` extracted; `ToastProvider`/`ToastList` added for non-blocking feedback
- **N+1 fix** in `generate-pick-list.ts`: variant queries now batched (one query for all items, not one per item); `variant_id` typed as `string | null`
- **Docker Compose**: removed reference to deleted `seed-demo-historic.ts` seed script

### Fixed
- **RBAC middleware** snapshot tests added for all `/admin/fulfillment/*` routes
- **Jest test isolation**: module-level caches (`roleCache`, recipients cache, `rateLimitMap`) now export `clearX()` functions called in `beforeEach`
- **Hardcoded `"N° pedido:"` in order-confirmation**: now reads from `t.orderNumber`
- **Account page order tracking bug**: `"not_fulfilled".includes("fulfilled")` evaluated to `true` (substring match), causing the shipping step to show as done for every unfulfilled order; replaced with exact-match `Set`
- **Account page payment status**: "Pago validado" now only shows when `payment_status` is `captured` or `paid` — `authorized` correctly shows "Validando pago"
- **Account page layout**: orders section moved above promotions/price-tier grid (primary information hierarchy); redundant 3-badge row removed; `OrderStepper` circles updated to brand teal `#61c3d8` (DESIGN.md token)

## [0.1.0.0] - 2026-03-15

### Added
- **Purchase Department module**: full order lifecycle for suppliers and purchase orders — create, submit, cancel, receive (with Medusa inventory update)
- **RBAC middleware** (`backend/src/lib/rbac.ts`): role-based access control on all admin routes; roles stored in `user.metadata.role`; `admin` bypasses all checks; no-role users receive 403
- **Role constants** (`backend/src/admin/lib/roles.ts`): shared between backend middleware and admin UI Vite bundle; roles: `admin`, `purchasing`, `inventory`, `marketing`, `customer_service`
- **Role assignment widget** in Medusa admin user detail page; prevents self-demotion
- **Invite email subscriber**: sends SendGrid email via Medusa Notification module when a user is invited or re-invited; email contains a one-click accept link
- **Policy snapshot tests** (`middlewares-policy.unit.spec.ts`): verifies RBAC route configuration is correct at the config layer, not just the logic layer
- **RBAC documentation** (`docs/rbac.md`): full guide covering roles, route matrix, user creation, role assignment, troubleshooting
- **`.env.example`**: documents all required environment variables for Docker deployment
- **TODOS.md**: full ERP roadmap — 5 sprints from purchase module to WhatsApp platform and Easy Inventory OCR
- **gstack skill references** added to CLAUDE.md

### Changed
- Docker-compose env vars externalized — no hardcoded domains; all configurable via `.env`
- ROLES constants moved to `admin/lib/roles.ts` so both the backend and the admin Vite bundle can import them without circular dependencies
- Seed script now assigns `metadata.role: "admin"` to the initial admin user

### Fixed
- Medusa admin routes (`/admin/users*`, `/admin/invites*`, etc.) that opt out of global `authMiddleware` are no longer wrapped by `requireRole` — this was causing login failures and 401s on all admin API calls
- `requireRole` null-guards `auth_context` before accessing `actor_id` to prevent crashes on unauthenticated requests
- TypeScript return-type errors in `requireRole`: `res.status(N).json()` returns `MedusaResponse`, not `void`; fixed by separating the call from the `return` statement
