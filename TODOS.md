# TODOS — Aurelia ERP

Deferred work, vision items, and known gaps.
Created from plan-ceo-review session 2026-03-15. Updated after Sprint 2 plan review 2026-03-15. **Last updated: 2026-03-22 (i18n parity fix — account, auth, order-confirmation, shop-data all fully bilingual; 34 new tests).**

---

## Priority Legend

- **P1** — blocks other work or is a security/data-integrity risk
- **P2** — high business value, no blocker
- **P3** — delight / polish / vision

## Effort Legend

- **S** — under a day
- **M** — 1–3 days
- **L** — 3–7 days
- **XL** — > 1 week

---

## Sprint 1 — Foundations ✅ COMPLETE

### ✅ [P1] [M] RBAC on admin routes — DONE

Role-based middleware on all Medusa admin routes. `requireRole` in `backend/src/lib/rbac.ts`.
All routes covered. Policy snapshot tests in `middlewares-policy.unit.spec.ts`.

---

### ✅ [P3] [S] Role assignment widget — DONE

Medusa admin widget on user detail page. Dropdown for role selection. Self-demotion blocked.

---

### ✅ [P1] [M] Invite email subscriber — DONE

SendGrid email on `invite.created` / `invite.resent`. Token-based link to `/app/invite`.
Unit tests: happy path, not-found, error propagation.

---

### ⏳ [P3] [S] Cache current admin user identity in a React context

**What:** Share `sdk.admin.user.me()` result via React Query global instead of each widget calling it independently.

**Why:** As more widgets need the current user (permission hints, "you" labels), each adds an extra request on page load.

**How to apply:** `backend/src/admin/lib/use-current-user.ts` — React Query hook with stale-time ~5 min. All widgets use this hook.

**Trigger condition:** 3+ widgets calling `me()`, or visible duplicate requests in the network tab.

**Effort:** S | **Priority:** P3

---

### ⏳ [P3] [S] In-process role lookup cache in requireRole

**What:** Module-level `Map<actorId, {role, expiresAt}>` with 60-second TTL in `getUserRole()`.

**Why:** Every admin page load issues 3–6 `requireRole` checks = 3–6 DB queries for the same actor. A 60s cache eliminates 90%+ of these with no visible tradeoff.

**How to apply:** Add `roleCache` Map in `backend/src/lib/rbac.ts`. Check cache first; on miss, fetch from DB and store. Time-based invalidation only.

**Trigger condition:** Observable slowness in admin panel or before adding more admin widgets that make multiple API calls on load.

**Effort:** S | **Priority:** P3

---

### ⏳ [P3] [M] JWT role caching

**What:** Embed user role in JWT payload at login so `requireRole` doesn't need a DB query per request.

**Why:** The in-process cache (above) is the fast path. JWT embedding is the right long-term solution — survives process restarts, works across Node workers.

**How to apply:** Custom Medusa auth strategy that adds `role` claim to JWT. `requireRole` reads from `req.auth_context.role` instead of DB.

**Trigger condition:** >10 concurrent admin users or observed >50ms middleware overhead.

**Effort:** M | **Priority:** P3 | **Depends on:** In-process cache (above) as interim solution.

---

### ⏳ [P3] [S] Graceful 403 handling in the Medusa admin SPA

**What:** Non-admin users who navigate to a forbidden section see a blank page. Add a friendly "Access denied" experience.

**How to apply:** Global error boundary or top-level admin widget that intercepts 403 responses from the SDK and shows a toast/banner.

**Trigger condition:** Staff report confusion about blank pages.

**Effort:** S | **Priority:** P3

---

## Sprint 2 — The Fulfillment Loop ✅ COMPLETE

*Scope confirmed in plan-ceo-review 2026-03-15 (EXPANSION mode). Shipped commit `4823eb5` on 2026-03-21. Two code fixes applied in eng-review 2026-03-21: (1) batch variant queries in `generate-pick-list.ts` (was N+1), (2) RBAC policy snapshot tests added for all `/admin/fulfillment/*` routes.*

**ADR invariants addressed:** `goods_counted → receive_po_items`, `items_picked → set_order_picking`, `package_packed → set_order_packed`, `courier_collected → set_order_dispatched`, `low_stock → notify`, `packed_not_shipped > 24h → notify`.

---

### ✅ [P1] [S] Integration test: PO receipt → Medusa stock update — DONE

`backend/integration-tests/http/receive-purchase-order.spec.ts`. Seeds variant + inventory item + PO, receives, asserts `InventoryLevel.stocked_quantity` delta and `StockAdjustmentLog` record.

---

### ✅ [P1] [M] StockAdjustmentLog model (thin audit layer) — DONE

Append-only model `stock_adjustment_log` in `purchaseDepartment` module. Migration `Migration20260320000002`. Reason codes: `po_receive | order_pick | manual_adjustment | return_restock | correction`. Integrated into `receive-purchase-order` step — log insert failure triggers full compensation (stock rollback). `StockAdjustmentReasonCode` type exported for reuse in future steps.

---

### ✅ [P1] [S] PO status guard (re-receive protection) — DONE

`receive-purchase-order.ts` guards `status === "submitted"` — throws descriptive `UNEXPECTED_STATE` errors for `received` and `cancelled`. Unit-tested.

---

### ✅ [P1] [L] fulfill-order workflow (pick → pack → dispatch) — DONE

Three workflows: `startPickingWorkflow`, `confirmPackWorkflow`, `dispatchOrderWorkflow` in `backend/src/workflows/fulfill-order.ts`. Steps: `generate-pick-list`, `confirm-pack`, `dispatch-order` — each with full compensation. Admin UI at `backend/src/admin/routes/fulfillment/orders/page.tsx` (DataTable with Pack + Dispatch drawers). RBAC: mutations → `[ROLES.INVENTORY]`; reads → `[ROLES.INVENTORY, ROLES.CUSTOMER_SERVICE]`. 20 unit tests across 3 spec files. 163 total unit tests passing.

**Eng-review fix (2026-03-21):** `generate-pick-list.ts` now batches all variant ID lookups in one `query.graph` call (was N+1). RBAC policy snapshot tests added for all 6 fulfillment routes.

---

### ✅ [P2] [S] low-stock-check subscriber — DONE

`backend/src/subscribers/low-stock-check.ts`. Threshold from `LOW_STOCK_THRESHOLD` env var (default 5). Notifies `purchasing` + `inventory` roles. Full error suppression (`try/catch` → `logger.warn`). 4 unit tests.

---

### ✅ [P2] [S] packed-not-shipped scheduled job — DONE

`backend/src/jobs/packed-not-shipped.ts`. Runs hourly. Alerts after 24h in packed status, 4h cooldown via `last_notified_at` on `FulfillmentRecord`. Full error suppression. 3 unit tests.

---

### ✅ [P3] [S] DELIGHT: PO discrepancy flag — DONE

`discrepancy_count` on `PurchaseOrder` model. Computed in `receive-purchase-order` step (count of items where `received_qty ≠ ordered_qty`). Shown as warning badge on PO detail page at `/purchase/orders/[id]`.

---

### ✅ [P3] [S] DELIGHT: Supplier fill rate — DONE

`backend/src/admin/routes/purchase/suppliers/[id]/page.tsx` computes `Σ received_qty / Σ ordered_qty` client-side from existing PO data. No new backend model.

---

### ✅ [P3] [S] DELIGHT: KPI tiles on Aurelia dashboard — DONE

`/admin/fulfillment/kpis` API route returns `avg_lead_time_minutes`, `stuck_in_picking_count`, `dispatched_count_30d`. Dashboard updated to show these tiles. Accessible to `[ROLES.INVENTORY, ROLES.CUSTOMER_SERVICE]`.

---

## 🚀 Next Session — Where to Pick Up

**Branch:** `fix/propuesta-financial-review` — ready to merge to main.

**State as of 2026-03-21:**
- Sprint 1 ✅ + Sprint 2 ✅ fully shipped and eng-reviewed. 163 unit tests green.
- Two fixes applied this session: (1) batch variant queries in `generate-pick-list.ts`, (2) RBAC policy snapshot tests for all fulfillment routes.
- DB migrations through `Migration20260320000003` — includes `FulfillmentRecord` + `StockAdjustmentLog`.

**Recommended next steps (in order):**
1. **Merge this branch** — eng review cleared, tests green, no open decisions.
2. **Rebuild backend Docker** — migrations need to run (`docker compose up --build backend -d`). The `fulfillment_record` and `stock_adjustment_log` tables must exist before using the fulfillment UI.
3. **Sprint 2.5 — Storefront redesign** — DESIGN.md is written and locked. No code has been touched. Start at step 1 of the implementation order below.
4. **Sprint 3** — WhatsApp server-side layer (write ADR first per the TODO below).

**Sprint 2.5 implementation order (from DESIGN.md):**
1. Update `globals.css` CSS vars + import IBM Plex fonts in `layout.tsx`
2. Full-bleed hero (`page.tsx`)
3. Category cards with Medusa product photos
4. Product card hover buttons (catalog + homepage)
5. Favorites: heart button + localStorage + `/favoritos` page
6. Pagination `?page` URL param in `catalog/page.tsx`
7. Shop the Look dots → `ProductQuickView`
8. Trust signals row (blocked on copy from user)
9. WhatsApp button color (#25D366)

---

## Sprint 3 — WhatsApp Platform & Stock Intelligence

*Fulfillment was pulled into Sprint 2. Sprint 3 focuses on server-side notifications, customer-facing tracking, and per-variant stock intelligence.*

---

### [P1] [M] WhatsApp server-side notification layer

**What:** Move WhatsApp from localStorage link generation to server-side notifications via Twilio or 360dialog WhatsApp Business API.

**Why:** Current localStorage approach breaks on multi-device, is invisible to the backend, and can't support automated notifications (order dispatched, PO received, low stock).

**How to apply:** New module `backend/src/modules/notifications/`. Subscriber on `order.dispatched`, `purchase_order.submitted`, `inventory.low_stock` → trigger WA message via API. Requires `WHATSAPP_API_KEY` env var.

**Write the ADR first:** `adr/whatsapp-architecture.md` — provider comparison (Twilio vs 360dialog), cost model, trigger conditions for upgrade. Write before implementation starts.

**Effort:** M | **Priority:** P1 | **Depends on:** `fulfill-order` workflow (for dispatch event).

---

### [P2] [M] DELIGHT: Customer order tracking page

**What:** `/track/[orderId]` — status timeline: paid → picking → packed → dispatched → delivered, with a WhatsApp contact button.

**Why:** Reduces CS WhatsApp flood. Customers in Argentina message on WhatsApp constantly to ask "where's my order?" A self-service page cuts this significantly.

**How to apply:** New Next.js page. Fetch order from Medusa store API. Show fulfillment status timeline. Add WhatsApp link to CS. Bilingual (ES/KO).

**Effort:** M | **Priority:** P2 | **Depends on:** `fulfill-order` workflow (for status data).

---

### [P2] [S] Dispatch WA notification to customer

**What:** When an order is dispatched, automatically send a WhatsApp message to the customer with tracking number and carrier link.

**Why:** The #1 CS request in Argentina is "did my order ship?" — automating this response eliminates a large fraction of inbound WA messages.

**Note:** Cannot be built on the current localStorage approach. Requires the server-side WA API above.

**Effort:** S | **Priority:** P2 | **Depends on:** WA server-side layer.

---

### [P2] [S] Per-variant reorder thresholds

**What:** Store a `reorder_threshold` per product variant (as variant metadata or a new thin model). The `low-stock-check` subscriber in Sprint 2 uses a global default — this upgrades it to per-variant thresholds.

**Why:** A bestseller running out of 5 units is critical. A slow mover running out of 5 units is fine. Global threshold is a blunt instrument.

**How to apply:** Add `reorder_threshold` to variant metadata. UI widget on variant detail page to set it. Update `low-stock-check` subscriber to read per-variant value, fall back to global default.

**Effort:** S | **Priority:** P2 | **Depends on:** `low-stock-check` subscriber (Sprint 2).

---

### [P2] [S] SKU standardization enforcement

**What:** Validate product SKU format `{BRAND}-{PLATING}-{STONE}-{NNNNN}` on product creation. Also store `vendor_sku` and `barcode` as variant metadata.

**Why:** Without enforcement, the catalog drifts and the Easy Inventory OCR feature (Sprint 5) can't match SKUs reliably.

**How to apply:** Backend middleware or Medusa admin product form widget that rejects malformed SKUs on create/update.

**Effort:** S | **Priority:** P2 | **Depends on:** None.

---

### [P3] [S] DELIGHT: Aged stock badge on product cards

**What:** Visual badge on Medusa product list: "X days since last sale." Color-coded: green (<30d), yellow (30–60d), red (>60d).

**Why:** ADR defines `aged_stock > 60 days → notify marketing`. A badge gives marketing instant visibility. Requires 30+ days of sales data to be meaningful — hence Sprint 3.

**How to apply:** Admin widget on product list route. Compute last-sale date from order line items.

**Effort:** S | **Priority:** P3 | **Depends on:** None (but needs sales data to exist).

---

### [P3] [S] DELIGHT: Days-of-stock badge on PO items

**What:** On a PO's line items, show "~X days of stock remaining" based on current stock ÷ avg daily sales (last 30d).

**Why:** Purchasing sees reorder urgency without running a report. Sprint 3 timing gives Sprint 2 time to accumulate sales velocity data.

**How to apply:** Query avg daily sales per variant (order line items, last 30d). Compute days-of-stock = `current_level / avg_daily_sales`. Handle 0 sales case (show "N/A — no recent sales").

**Effort:** S | **Priority:** P3 | **Depends on:** Fulfillment data accumulating (Sprint 2).

---

## Sprint 4 — Returns & Customer Service

### [P2] [L] Returns / RMA workflow

**What:** RMA issuance, return arrival logging, inspection (with photo), disposition (resell/repair/scrap), stock update with `return_restock` audit log entry.

**Why:** ADR: `return_arrived → receive_rma`. Without this, returned goods are invisible to the system. Disposition requires audit trail (same `StockAdjustmentLog` pattern from Sprint 2, `reason=return_restock`).

**How to apply:** Workflows: `create-rma`, `receive-return`, `inspect-return`, `dispose-return`. Admin routes at `/admin/returns/*`. `StockAdjustmentLog` reason `return_restock` already defined in Sprint 2 enum.

**Effort:** L | **Priority:** P2 | **Depends on:** `fulfill-order` workflow (Sprint 2), `StockAdjustmentLog` (Sprint 2).

---

### [P2] [L] Customer Service module

**What:** Ticket creation, return approval, refund processing (within threshold), order search.

**Why:** ADR defines CS role with ERP capabilities. Currently all CS is in WhatsApp with no audit trail.

**How to apply:** New admin routes at `/admin/customer-service/*`. Ticket model with status + notes. Integrates with Medusa orders and returns.

**Effort:** L | **Priority:** P2 | **Depends on:** Returns/RMA workflow.

---

### [P2] [S] Remaining ADR automated alerts

**What:** Complete the 4-alert ADR automation:
- ✅ `low_stock → notify` (Sprint 2)
- ✅ `packed_not_shipped > 24h → notify` (Sprint 2)
- `aged_stock > 60 days → notify marketing` (Sprint 4 — needs sales data)
- `return_not_inspected > 48h → notify inventory manager` (Sprint 4 — needs Returns module)

**How to apply:** Two new scheduled jobs. Fire via WA server-side layer (Sprint 3). Same log+suppress error handling pattern.

**Effort:** S | **Priority:** P2 | **Depends on:** WA server-side layer (Sprint 3), Returns workflow (above).

---

## Sprint 5 — Vision Horizon

### [P3] [XL] Easy Inventory (OCR + image recognition)

**What:** Operator photographs goods → system identifies via barcode/OCR/image match → operator confirms quantity → stock record created. No custom model training — use Google Vision or AWS Rekognition.

**Fallback chain:** barcode → OCR label → vendor catalog image → local catalog image → manual SKU entry. Store `confidence_source` on every record.

**Effort:** XL | **Priority:** P3 | **Depends on:** SKU standardization (Sprint 3), `StockAdjustmentLog` (Sprint 2).

---

### [P3] [XL] DELIGHT: WhatsApp-as-warehouse-interface

**What:** Warehouse operators interact entirely via WhatsApp. PO submitted → WA message → operator replies with photos and quantities → system receives PO automatically. No admin login required.

**Why:** The 10x warehouse UX. Removes the #1 adoption barrier. The `fulfill-order` workflow steps (built in Sprint 2) can be driven from a WA webhook — same business logic, different channel.

**Effort:** XL | **Priority:** P3 | **Depends on:** WA server-side layer (Sprint 3), Easy Inventory OCR.

---

---

## Sprint 2.5 — Storefront Redesign (UI)

*Scope confirmed in plan-design-review 2026-03-20. Full design spec below.*

---

### [P2] [M] Storefront visual redesign

**What:** Complete visual overhaul of the storefront — new typography (IBM Plex Serif + Sans), new color palette (#3d276b/#61c3d8/#f4f4f4/#f7f7f7), full-bleed hero, image-based category cards, product card hover buttons, favorites, pagination memory, Shop the Look quick view, WhatsApp green button.

**Design decisions locked in plan-design-review 2026-03-20:**
- Typography: IBM Plex Serif (titles `h1–h3`) + IBM Plex Sans (body, UI)
- Colors: `--brand-primary: #3d276b` (titles), `--brand-accent: #61c3d8` (buttons/badges), `--background: #f4f4f4`, `--surface: #f7f7f7`
- CTA buttons: teal `#61c3d8` bg + `#111111` dark text (WCAG AA: 4.7:1 contrast ✅)
- Hero: full-bleed `min-h-screen`, text bottom-left white, "Ver más →" CTA, retain 3-slide rotation
- Category images: first Medusa product photo per category (dynamic, 1 API call)
- Card image heights: `h-52` catalog, `h-64` homepage featured
- Hover buttons: two 36px circular icons (+ for add, 👁 for quick view), animate in at bottom of image on `:hover` AND `:focus-within`
- Mobile behavior: no hover buttons — tap image navigates to product page
- Favorites: localStorage, heart icon top-right of card image, `/favoritos` page
- Favorites empty state: "Todavía no guardaste nada — explorá la colección" + CTA to /catalog
- Favorites heart: `aria-label="Guardar en favoritos"` + `aria-pressed` state, teal fill when saved
- Pagination: `?page=2` URL query param (browser back button restores position)
- Shop the Look dots: trigger `ProductQuickView` (reuse existing component, not Link)
- Trust signals row: include with real B2B copy (copy TBD by user before shipping)
- WhatsApp float: green (#25D366)
- Header: backdrop-blur, reduced visual weight

**Implementation order:**
1. Create `DESIGN.md` with full token set
2. Update `globals.css` CSS vars + import IBM Plex fonts in `layout.tsx`
3. Full-bleed hero (`page.tsx`)
4. Category cards with Medusa product photos
5. Product card hover buttons (both `page.tsx` featured + `catalog/page.tsx`)
6. Favorites: heart button + localStorage hook + `/favoritos` page
7. Pagination `?page` URL param in `catalog/page.tsx`
8. Shop the Look dots → `ProductQuickView`
9. Trust signals row (blocked on copy)
10. WhatsApp button color

**Effort:** M | **Priority:** P2

---

### [P3] [S] DESIGN.md — living design system document

**What:** Create `DESIGN.md` at repo root with color tokens, typography scale, spacing vocabulary, component conventions, and design rationale.

**Why:** Without it, design decisions drift across files. New contributors (and future Claude sessions) have no single source of truth.

**How to apply:** After storefront redesign ships, extract all token decisions into a DESIGN.md. Keep it updated as new UI ships.

**Effort:** S | **Priority:** P3 | **Depends on:** Storefront redesign (above).

---

### [P3] [S] Header link to /favoritos

**What:** Add a heart/bookmark icon in the site header that links to `/favoritos`. Currently there's no nav entry point.

**Why:** Without a discoverable entry point, users can't find their saved items unless they know the URL. The /favoritos page (built in redesign sprint) has zero discovery path.

**How to apply:** Add icon link to `site-header.tsx` header nav. Teal heart icon. Show count badge if >0 favorites in localStorage.

**Effort:** S | **Priority:** P3 | **Depends on:** Favorites localStorage implementation (storefront redesign).

---

### [P3] [M] Account-tied server favorites

**What:** Upgrade localStorage favorites to Medusa customer account favorites — synced across devices, persistent across browser clears.

**Why:** B2B buyers use multiple devices. A wholesaler who saves a collection on desktop expects to see it on mobile. localStorage is per-device.

**How to apply:** New Medusa custom module `WishlistItem(customer_id, product_id, created_at)`. API routes at `/store/wishlist`. Frontend hook reads from account if logged in, falls back to localStorage if guest.

**Effort:** M | **Priority:** P3 | **Depends on:** localStorage favorites (storefront redesign), Sprint 3 platform.

---

---

### [P3] [S] Migrate hardcoded hex colors to CSS variables

**What:** Replace hardcoded Tailwind arbitrary hex values (`bg-[#111111]`, `text-[#777777]`, `border-black/10`, etc.) in `page.tsx`, `catalog/page.tsx`, `product-quick-view.tsx`, and `site-header.tsx` with semantic CSS variable references (`var(--foreground)`, `var(--brand-accent)`, etc.).

**Why:** The new design token system (`globals.css` CSS vars) only works if components reference the tokens. Currently, a theme change requires grep-and-replace across the codebase. New components (ProductCard) will use CSS vars from the start — this normalizes the rest.

**How to apply:** Define Tailwind `theme.extend` or use `@apply` / inline `var()`. Audit each page for hardcoded hex values. Replace with the semantic token from `DESIGN.md`. New `ProductCard` component serves as the reference implementation.

**Effort:** S | **Priority:** P3 | **Depends on:** Storefront redesign (CSS vars must be defined first).

---

---

### ⏳ [P2] [S] IFulfillmentService error guard in dispatch-order step

**What:** Wrap the Medusa `IFulfillmentService` call in the `dispatch-order` step with a try/catch that converts unknown service errors to `MedusaError` 503 with an actionable message.

**Why:** If Medusa's fulfillment service is unavailable, the dispatch step currently propagates a raw internal error. `FulfillmentRecord` stays in `packed` (correct), but the caller sees a cryptic 500. Identified as a critical gap in plan-eng-review 2026-03-20.

**How to apply:** 3-line try/catch in `backend/src/workflows/steps/dispatch-order.ts`. Catch any error from `IFulfillmentService`, rethrow as `new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Fulfillment service unavailable — order remains packed')`.

**Effort:** S | **Priority:** P2 | **Depends on:** `fulfill-order` workflow (Sprint 2).

---

### ⏳ [P3] [S] packed-not-shipped: last_notified_at write failure

**What:** If the `last_notified_at` update fails after a notification is sent in the `packed-not-shipped` job, the cooldown doesn't engage and the job re-notifies on the next hourly run.

**Why:** Low probability but causes minor alert fatigue if DB writes are flaky. The `withSuppressedErrors` wrapper covers the full job body — the update call needs its own inner guard.

**How to apply:** In `backend/src/jobs/packed-not-shipped.ts`, after each `notify()` call, wrap the `fulfillmentService.update(order.id, { last_notified_at: now })` in a separate try/catch with `logger.warn` on failure.

**Effort:** S | **Priority:** P3 | **Depends on:** `packed-not-shipped` job (Sprint 2).

---

*Last updated: 2026-03-20 — plan-eng-review (Sprint 2 fulfillment loop)*
