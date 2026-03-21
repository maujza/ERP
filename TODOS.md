# TODOS — Aurelia ERP

Deferred work, vision items, and known gaps.
Created from plan-ceo-review session 2026-03-15. Updated after Sprint 2 plan review 2026-03-15.

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

## Sprint 2 — The Fulfillment Loop

*Scope confirmed in plan-ceo-review 2026-03-15 (EXPANSION mode). Closes the physical→ERP cycle from order-placed to order-dispatched.*

**ADR invariants addressed:** `goods_counted → receive_po_items`, `items_picked → set_order_picking`, `package_packed → set_order_packed`, `courier_collected → set_order_dispatched`, `low_stock → notify`, `packed_not_shipped > 24h → notify`.

---

### [P1] [S] Integration test: PO receipt → Medusa stock update ← BUILD FIRST

**What:** Integration test that verifies `receive-purchase-order` workflow actually increments Medusa inventory levels for the received variant.

**Why:** Highest-risk silent failure in the system — the workflow could silently succeed while stock doesn't change. This test is the anchor for all Sprint 2 work.

**How to apply:** `backend/src/workflows/__tests__/receive-purchase-order.integration.spec.ts`. Seed product variant, create PO, receive it, assert `InventoryLevel.stocked_quantity` delta. Build and pass this test BEFORE adding `StockAdjustmentLog`.

**Effort:** S | **Priority:** P1 | **Depends on:** Nothing — run this first.

---

### [P1] [M] StockAdjustmentLog model (thin audit layer)

**What:** Append-only custom model recording every inventory level change with reason_code + actor_id + delta + timestamp. Does NOT duplicate Medusa's native `StockLocation` or `InventoryLevel` — those are used directly.

**Why:** ADR invariant: "stock adjustment requires reason_code + operator + timestamp." Violations must generate incidents.

**Architecture decisions (locked in plan review 2026-03-15):**
- `StockAdjustmentLog(id, variant_id, location_id, delta, reason_code, actor_id, created_at)`
- `reason_code` is an enum (TypeScript union + Zod + DB CHECK constraint): `po_receive | order_pick | manual_adjustment | return_restock | correction`
- Append-only — no updates, no deletes, ever
- The `receive-purchase-order` workflow step calls `updateInventoryLevels` AND inserts `StockAdjustmentLog` **in the same transaction**. If the log insert fails, the step compensates and rolls back the stock update (2A decision).
- Medusa native `StockLocation` used directly — no custom `WarehouseLocation` model (1A decision)

**Required tests:**
- Unit: `StockAdjustmentLog` insert failure → workflow compensates → stock level unchanged (mock injection pattern)
- Unit: Invalid `reason_code` → Zod 400 error
- Integration: `receive-purchase-order` → `StockAdjustmentLog` record exists with correct reason + actor

**Effort:** M | **Priority:** P1 | **Depends on:** Integration test above (run first).

---

### [P1] [S] PO status guard (re-receive protection)

**What:** At the start of `receive-purchase-order`, verify `PO.status === "submitted"`. Return 400 "PO already received" if status is `received` or `cancelled`.

**Why:** Without this guard, a duplicate receive call creates duplicate stock increments and duplicate `StockAdjustmentLog` records. This is a data integrity risk, not just a UX issue.

**How to apply:** Add status check as the first step in `receive-purchase-order.ts`. Same pattern as the new dispatch idempotency guard (see below).

**Effort:** S | **Priority:** P1 | **Depends on:** Integration test (run first).

---

### [P1] [L] fulfill-order workflow (pick → pack → dispatch)

**What:** Custom lightweight workflow with 3 steps: `generate-pick-list`, `confirm-pack` (weight + dimensions), `dispatch-order` (tracking number). Admin routes at `/admin/fulfillment/*`. Protected by `requireRole([ROLES.INVENTORY])`.

**Architecture decisions (locked in plan review 2026-03-15):**
- Custom workflow wrapping Medusa's native `IFulfillmentService` — does not replace it
- Order state machine: `pending → picking → packed → dispatched | cancelled`
- Status guard at each step: verify current state before transitioning (no skip-step transitions)
- Dispatch is idempotent: if already dispatched, return early (no-op) — prevents double-tap on mobile (4A decision)
- `generate-pick-list` validates order has >0 line items; returns 400 otherwise
- Pick list includes product photos (first image from Medusa product) for visual verification

**Required tests:**
- Integration: full happy path `pending → picking → packed → dispatched`
- Unit: dispatch idempotency (already dispatched → no-op)
- Unit: `generatePickList` with 0 items → `WorkflowStepError`
- Unit: `confirmPack` with weight=0 → Zod 400
- Unit: `dispatchOrder` with empty tracking string → Zod 400

**Effort:** L | **Priority:** P1 | **Depends on:** `StockAdjustmentLog` (for `order_pick` reason code on picking step).

---

### [P2] [S] low-stock-check subscriber

**What:** Medusa subscriber on `inventory.updated` events. If updated variant's stock level falls below threshold, fire notification to purchasing + inventory roles.

**Architecture decisions:**
- Threshold: `LOW_STOCK_THRESHOLD` env var (global default: 5 units). Per-variant threshold is a Sprint 3 enhancement.
- Error handling: `try/catch` wrapping entire subscriber. On any failure, `logger.warn` with `{ variant_id, error }`. Never propagate — a missed alert must never crash the inventory update (2B decision).
- TODO: When bulk PO receives become common (>50 items), replace per-event subscriber with a 15-minute scheduled cron. A module-level TTL cache (`Map<variantId, lastChecked>`) is the fast path if needed sooner.

**Required tests:**
- Unit: happy path → `createNotifications` called with correct variant info
- Unit: notification module throws → `logger.warn` called, subscriber does not throw
- Unit: inventory query fails → `logger.warn` called, subscriber does not throw
- Unit: stock above threshold → no notification sent

**Effort:** S | **Priority:** P2 | **Depends on:** Nothing (uses Medusa notification module).

---

### [P2] [S] packed-not-shipped scheduled job

**What:** Medusa scheduled job (`backend/src/jobs/`) running hourly. Queries orders in `packed` status for >24 hours. Fires notification to inventory role.

**Why:** ADR mandatory automation: `packed_not_shipped > 24h → notify inventory`. Without this, packed orders can sit forgotten before dispatch.

**How to apply:** `backend/src/jobs/packed-not-shipped.ts`. Query orders where `status = 'packed' AND updated_at < NOW() - INTERVAL '24 hours'`. Fire notification per order. `try/catch` wrapping: on failure, `logger.warn` + continue (same log+suppress pattern as low-stock subscriber).

**Required tests:**
- Unit: orders found → notification called for each
- Unit: no orders found → no notification
- Unit: query fails → `logger.warn`, job does not throw

**Effort:** S | **Priority:** P2 | **Depends on:** `fulfill-order` workflow (for `packed` status).

---

### [P3] [S] DELIGHT: PO discrepancy flag

**What:** When `received_qty ≠ ordered_qty` on a PO receive, store a `discrepancy_count` on the PO and display a red badge on the PO detail page ("Received 47 of 50 units").

**Why:** Purchasing gets immediate visibility into supplier shortfalls without running a report. Feeds the supplier fill rate metric.

**How to apply:** Compare totals in the `receive-purchase-order` step. Add `discrepancy_count` field to `PurchaseOrder` model (nullable). Display in PO detail widget.

**Effort:** S | **Priority:** P3 | **Depends on:** `StockAdjustmentLog` (same step touches PO receive).

---

### [P3] [S] DELIGHT: Supplier fill rate

**What:** On the supplier detail page, show `fill_rate = Σ received_qty / Σ ordered_qty` across all POs for the supplier, as a percentage.

**Why:** Purchasing can evaluate suppliers without any extra data entry. Computed in real-time from existing PO receipt data. Enriched by discrepancy flag.

**How to apply:** Aggregate query in `backend/src/admin/routes/purchase/suppliers/[id]/page.tsx`. No new backend logic — all data is in existing PO + PO items.

**Effort:** S | **Priority:** P3 | **Depends on:** PO discrepancy flag (above, for richer data).

---

### [P3] [S] DELIGHT: 2 KPI tiles on Aurelia dashboard

**What:** Add two new tiles to the existing `aurelia-dashboard` admin route:
1. **Avg fulfillment lead time** (last 30 days): time from `picking` to `dispatched`
2. **Orders stuck in picking >24h**: count with link to fulfillment list

**Why:** Closes ADR KPI gap. Ops lead sees fulfillment health at a glance without running a report. Data becomes available the day fulfillment workflow ships.

**Effort:** S | **Priority:** P3 | **Depends on:** `fulfill-order` workflow.

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

*Last updated: 2026-03-20 — plan-eng-review (UI redesign architecture)*
