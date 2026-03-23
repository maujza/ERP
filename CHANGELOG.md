# Changelog

All notable changes to this project will be documented in this file.

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
- 172+ backend unit tests; 636 frontend tests (up from 545)

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
