# TODOS — Aurelia ERP

Deferred work, vision items, and known gaps. Created from plan-ceo-review session 2026-03-15.

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

## Sprint 1 — Foundations

### [P1] [M] Implement RBAC on admin routes ← SPRINT 1, BUILD NOW

**What:** Add role-based middleware to Medusa admin routes enforcing the 6 roles defined in `adr/erp_roles.md`: Admin, Inventory, Purchasing, Marketing, Customer Service.

**Why:** Marketing admins currently have the same access as the system owner and can see cost prices. This violates the operational spec.

**How to apply (from eng review 2026-03-15):**
- Role stored in `user.metadata.role` (single string, canonical key)
- New file `backend/src/lib/rbac.ts` — shared `getUserRole()` + `requireRole(allowedRoles)` middleware
- Users with no role set → 403 (explicit fail, not pass-through)
- Route permissions: `/admin/purchase/*` → `[admin, purchasing]`; receive endpoint also allows `inventory`
- Update `whatsapp-notifications/route.ts` to import from shared util (DRY fix)
- Unit tests in `backend/src/lib/__tests__/rbac.unit.spec.ts` — 4 cases: allowed passes, disallowed 403s, no role 403s, admin always passes

**Depends on:** None — start now.

---

### [P3] [S] Role assignment UI in Medusa admin

**What:** Admin widget on the user detail page to select a user's role from a dropdown.

**Why:** Currently roles must be set via API or seed script. Onboarding new staff requires developer access. A dropdown widget removes that friction.

**How to apply:** Medusa admin UI widget on the user detail route. Reads/writes `user.metadata.role`. Uses the same role constants from `rbac.ts`.

**Effort:** S | **Priority:** P3 | **Depends on:** RBAC middleware (above).

---

### [P3] [S] Cache current admin user identity in a React context

**What:** Share the result of `sdk.admin.user.me()` via a React context (or React Query global) across all admin widgets, instead of each widget calling it independently.

**Why:** The role assignment widget calls `me()` to guard against self-demotion. As more widgets need the current user's identity (e.g., showing "you" labels, permission hints), each will add an extra HTTP call on page load.

**How to apply:** Create `backend/src/admin/lib/use-current-user.ts` — a React Query hook that caches the result of `sdk.admin.user.me()` with a stale-time of a few minutes. All widgets use this hook. Single deduped request.

**Trigger condition:** 3+ widgets need `me()`, or performance profiling shows repeated identical requests in the network tab.

**Effort:** S | **Priority:** P3 | **Depends on:** Role assignment widget (above).

---

### [P3] [M] JWT role caching (future optimization)

**What:** Embed the user's role in the JWT payload at login time so `requireRole` middleware doesn't need an extra DB query per request.

**Why:** Currently `requireRole` calls `query.graph` on every request. Fine for <10 admin users but will show latency at scale.

**How to apply:** Custom auth strategy or Medusa token hook that adds `role` claim to JWT. `requireRole` reads from `req.auth_context.role` instead of DB.

**Trigger condition:** >10 concurrent admin users or observed >50ms middleware overhead.

**Effort:** M | **Priority:** P3 | **Depends on:** RBAC middleware (above).

---

### [P3] [S] In-process role lookup cache in requireRole

**What:** Cache the result of `query.graph(user)` in `getUserRole()` using a `Map<actorId, {role, expiresAt}>` with a 60-second TTL.

**Why:** With RBAC extended to all Medusa admin routes, every API call (product list, order view, etc.) now triggers a DB query to fetch the user's role. A typical admin page load issues 3–6 API calls = 3–6 sequential `query.graph` calls for the same actor. An in-process cache eliminates 90%+ of these under normal backoffice use with no visible tradeoff (role changes take effect within 60s).

**How to apply:** Add a module-level `roleCache = new Map<string, { role: Role | null; expiresAt: number }>()` in `backend/src/lib/rbac.ts`. In `getUserRole()`, check the cache first; on miss, fetch from DB and store. Invalidation is time-based only (60s). This is simpler and faster to implement than the JWT embedding approach (see "JWT role caching" above), with the tradeoff that it doesn't survive process restarts and isn't shared across Node workers.

**Trigger condition:** Any observable slowness in the admin panel, or before adding more admin widgets that make multiple API calls on load.

**Effort:** S | **Priority:** P3 | **Depends on:** RBAC middleware with full route coverage (this sprint).

---

### [P3] [S] Graceful 403 handling in the Medusa admin SPA

**What:** When a non-admin user navigates to a section they don't have access to (e.g., inventory user going to `/app/regions`), they currently see a blank page or a raw API error. Add a friendly "Access denied" experience.

**Why:** Non-technical staff who accidentally click the wrong nav item will be confused by a blank page. A clear message ("You don't have permission to access this section") is important for usability.

**How to apply:** Medusa admin UI is a compiled SPA — we can't modify its built-in pages. However, we can add a global error boundary or a custom admin widget injected at a top-level zone that detects 403 responses from the SDK and shows a toast/banner. Alternatively, document the issue for users and rely on training until Medusa exposes a hook for this.

**Trigger condition:** Staff report confusion about blank pages when navigating to sections they're not allowed to access.

**Effort:** S | **Priority:** P3 | **Depends on:** RBAC full route coverage (this sprint).

---

## Sprint 2 — Inventory & Stock Intelligence

### [P1] [M] Integration test: PO receipt → Medusa stock update

**What:** Write an integration test that verifies the `receive-purchase-order` workflow actually increments Medusa inventory levels for the received variant.

**Why:** This is the highest-risk silent failure in the system. Unit tests exist for the workflow step, but no test verifies that the Medusa stock level changes end-to-end.

**How to apply:** Add to `backend/src/workflows/__tests__/` using the integration test pattern. Seed a product variant, create a PO, receive it, assert Medusa inventory level delta.

**Effort:** M | **Priority:** P1 | **Depends on:** None.

---

### [P1] [M] Inventory Module

**What:** Custom Medusa module for warehouse locations, adjustment audit log, and reorder thresholds.

**Why:** Medusa tracks stock levels natively but provides no location data, no reason codes for adjustments, and no reorder configuration. Without this, the system can't enforce the ADR invariant: "stock adjustment requires reason_code + operator + timestamp."

**How to apply:** New module `backend/src/modules/inventory/` with models: `WarehouseLocation`, `StockAdjustment`. Link `StockAdjustment → product_variant`. Expose admin routes at `/admin/inventory/*`.

**Effort:** L | **Priority:** P1 | **Depends on:** None.

---

### [P2] [S] SKU standardization enforcement

**What:** Validate product SKU format `{BRAND}-{PLATING}-{STONE}-{NNNNN}` (e.g., `AR-GP-CR-00125`) on product creation in the admin.

**Why:** Without enforcement, the catalog drifts and the Easy Inventory OCR feature (Sprint 5) can't match SKUs reliably.

**How to apply:** Add a validator in the Medusa admin product form widget, or a backend middleware that rejects malformed SKUs. Also store `vendor_sku` and `barcode` as variant metadata per the ADR.

**Effort:** S | **Priority:** P2 | **Depends on:** None.

---

### [P2] [S] Low-stock alert automation

**What:** Automated notification when a variant's stock falls below its reorder threshold.

**Why:** The ADR defines `low_stock → notify purchasing & inventory` as a minimum automation. Currently there's no mechanism for this.

**How to apply:** Medusa subscriber pattern (`backend/src/subscribers/`). On order placed / PO received, check stock levels vs reorder threshold. If below threshold, fire WhatsApp notification to purchasing + inventory roles.

**Effort:** S | **Priority:** P2 | **Depends on:** Inventory Module (for reorder thresholds).

---

### [P3] [S] DELIGHT: Aged stock badge on product cards

**What:** Visual badge on Medusa product list showing "X days since last sale."

**Why:** The ADR defines aged_stock > 60 days as a trigger to notify marketing. A badge in the admin gives marketing instant visibility without a report.

**How to apply:** Admin widget on the product list route. Compute last-sale date from order line items. Show a colored badge: green (<30d), yellow (30–60d), red (>60d).

**Effort:** S | **Priority:** P3 | **Depends on:** None.

---

### [P3] [S] DELIGHT: Supplier scorecard

**What:** On the supplier detail page, show computed metrics: `delivery_on_time` (yes/no), `fill_rate` (received_qty / ordered_qty %), `discrepancy_count` across all POs.

**Why:** Purchasing can make better supplier decisions without any extra data entry — computed from existing PO receipt data.

**How to apply:** Add a `SupplierStats` computed section to `backend/src/admin/routes/purchase/suppliers/page.tsx`. Query all POs for the supplier, compute metrics client-side.

**Effort:** S | **Priority:** P3 | **Depends on:** purchase department module (done).

---

### [P3] [S] DELIGHT: Margin column on purchase order items

**What:** When viewing a PO, show `unit_cost`, current `sale_price`, and computed `margin %` side-by-side for each line item.

**Why:** Purchasing immediately knows if they're buying at the right price. No extra data entry required.

**How to apply:** Fetch variant prices in the PO items query. Add a computed column to the PO items table in the admin UI.

**Effort:** S | **Priority:** P3 | **Depends on:** purchase department module (done).

---

## Sprint 3 — Fulfillment & WhatsApp Platform

### [P1] [L] Fulfillment workflow

**What:** Pick list generation, pack confirmation (weight + dimensions), dispatch with tracking number.

**Why:** The ADR's physical→ERP mapping defines `items_picked → set_order_picking`, `package_packed → set_order_packed`, `courier_collected → set_order_dispatched`. None of these exist in the system yet.

**How to apply:** New Medusa workflows: `generate-pick-list`, `confirm-pack`, `dispatch-order`. Admin routes at `/admin/fulfillment/*`. Integrates with Medusa's native fulfillment status.

**Effort:** L | **Priority:** P1 | **Depends on:** None.

---

### [P1] [L] Mobile-first warehouse UX

**What:** Phone-optimized admin route set for pick/pack/receive operations. Not desktop-with-responsive-CSS — dedicated mobile layouts.

**Why:** Warehouse operators work on the floor with phones. The desktop admin UI has broken on mobile twice. Mobile UX is the adoption gateway.

**How to apply:** New admin routes at `/admin/warehouse/*` with large tap targets, barcode scanner integration (device camera), and step-by-step flows. Separate from the desktop purchase/supplier management UI.

**Effort:** L | **Priority:** P1 | **Depends on:** Fulfillment workflow.

---

### [P1] [M] WhatsApp server-side notification layer

**What:** Move WhatsApp from localStorage link generation to server-side notifications via Twilio or 360dialog WhatsApp Business API.

**Why:** Current localStorage approach breaks on multi-device, is invisible to the backend, and can't scale to automated notifications (low stock, order dispatched, PO received).

**How to apply:** New module `backend/src/modules/notifications/`. Subscriber pattern: on order dispatched, on PO submitted, on low stock → trigger WA message via API. Requires `WHATSAPP_API_KEY` env var.

**Effort:** M | **Priority:** P1 | **Depends on:** Fulfillment workflow (for dispatch event).

---

### [P2] [M] ADR: WhatsApp architecture decision record

**What:** Write an ADR documenting: why localStorage was chosen initially, what the threshold is to move to WhatsApp Business API, which provider (Twilio vs 360dialog), and what the migration path looks like.

**Why:** Without this, the next engineer will rebuild the WA integration inconsistently.

**How to apply:** New file `adr/whatsapp-architecture.md`. Include cost model, provider comparison, and trigger conditions for the upgrade.

**Effort:** S | **Priority:** P2 | **Depends on:** None — write before Sprint 3 WA work starts.

---

### [P2] [M] DELIGHT: Customer order tracking page

**What:** `/track/[orderId]` showing status timeline: paid → packed → dispatched → delivered, with a WhatsApp contact button.

**Why:** Reduces CS ticket volume. Customers currently have no self-service visibility after order confirmation. In Argentina, WhatsApp inquiry flood is the primary CS cost.

**How to apply:** New Next.js page. Fetch order by ID from Medusa store API. Show fulfillment status timeline. Add WhatsApp link to CS contact. Bilingual (ES/KO).

**Effort:** M | **Priority:** P2 | **Depends on:** Fulfillment workflow (for status data).

---

## Sprint 4 — Returns & Customer Service

### [P2] [L] Returns / RMA workflow

**What:** RMA issuance, return arrival logging, inspection (with photo), disposition (resell/repair/scrap), stock update.

**Why:** The ADR defines `return_arrived → receive_rma` as a required physical→ERP mapping. Without it, returned goods become invisible to the system.

**How to apply:** New workflows: `create-rma`, `receive-return`, `inspect-return`, `dispose-return`. Admin UI at `/admin/returns/*`.

**Effort:** L | **Priority:** P2 | **Depends on:** Fulfillment workflow.

---

### [P2] [L] Customer Service module

**What:** Ticket creation, return approval, refund processing (within threshold), order search.

**Why:** The ADR defines a Customer Service role with specific ERP capabilities. Currently all CS happens in WhatsApp with no audit trail.

**How to apply:** New admin routes at `/admin/customer-service/*`. Tickets as a simple model with status + notes. Integrate with Medusa orders and returns.

**Effort:** L | **Priority:** P2 | **Depends on:** Returns/RMA workflow.

---

### [P2] [S] Automated operational alerts

**What:** Automate all 4 alerts from the ADR:
- `aged_stock > 60 days → notify marketing`
- `packed_not_shipped > 24h → notify inventory`
- `return_not_inspected > 48h → notify inventory manager`
- `low_stock → notify purchasing & inventory`

**How to apply:** Medusa scheduled jobs (`backend/src/jobs/`) on a cron. Fire WA notifications via the server-side notification layer.

**Effort:** S | **Priority:** P2 | **Depends on:** WA server-side layer, Fulfillment workflow, Returns workflow.

---

## Sprint 5 — Vision Horizon

### [P3] [XL] Easy Inventory (OCR + image recognition)

**What:** Implement the inventory ingestion workflow defined in `adr/easy-inventory.md`. Operator photographs goods → system identifies product via barcode/OCR/image match → operator confirms quantity → stock record created.

**Why:** The adoption enabler for warehouses without structured purchasing processes.

**How to apply:** Use SaaS OCR (Google Vision / AWS Rekognition) — do NOT train custom models. Fallback chain: barcode → OCR → vendor image match → local image match → manual SKU. Store `confidence_source` on every record.

**Effort:** XL | **Priority:** P3 | **Depends on:** Inventory Module, SKU standardization.

---

### [P3] [XL] DELIGHT: WhatsApp-as-warehouse-interface

**What:** Warehouse operators interact entirely via WhatsApp. PO submitted → WA message sent → operator replies with photos and quantities → system receives PO automatically. No admin login required.

**Why:** The 10x version of the warehouse UX. Removes the #1 adoption barrier: requiring staff to learn a new interface.

**How to apply:** WhatsApp webhook integration + conversation state machine. Requires WhatsApp Business API + Easy Inventory OCR.

**Effort:** XL | **Priority:** P3 | **Depends on:** WhatsApp server-side layer, Easy Inventory.

---

*Last updated: 2026-03-15 — generated from plan-ceo-review session*
