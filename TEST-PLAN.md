# Test Plan
Updated 2026-04-19 — reflects main branch current state.

## Scope

Backend API testing for the fulfillment lifecycle, purchase department module, team task board, and notification layer.

---

## Purchase Department

### PO Receipt
- Receive a submitted PO → inventory level increments AND `StockAdjustmentLog` record created
- Receive a submitted PO where audit log write fails → inventory level NOT changed (compensation fires)
- Receive a draft PO → 400 "must be submitted"
- Receive an already-received PO → 400
- Receive PO with a variant that has no linked inventory item → skip gracefully (no crash)
- Re-receive protection: re-receive after partial failure cannot double-count stock

### PO Lifecycle
- Create PO → status `draft`
- Submit PO → status `submitted`
- Cancel PO from `draft` → status `cancelled`
- Cancel PO from `submitted` → status `cancelled`

### Supplier
- Create supplier → persisted, fill_rate defaults to null
- Update supplier → fields updated immutably
- Delete supplier → removed, linked POs unaffected (no cascade)
- Supplier fill_rate: receive PO → fill_rate recomputed and written to supplier row

---

## Fulfillment Lifecycle

### Happy Path
- Full lifecycle: pending → picking → packed → dispatched
- Dispatch returns tracking number in response

### Status Guards
- Dispatch idempotency: second dispatch call on already-dispatched order → 409
- Dispatch a cancelled order → 400 (status guard)
- confirmPack on non-picking order → 400

### Validation
- pick-list generation with 0 line items → 400
- confirmPack with weight=0 → Zod validation 400
- dispatchOrder with empty tracking string → Zod validation 400
- `StockAdjustmentLog` with invalid reason_code → Zod 400

### RBAC
- `inventory` role: can POST to all `/admin/fulfillment/*` routes
- `customer_service` role: GET `/admin/fulfillment/*` — allowed; POST — 403
- `purchasing` role: cannot access `/admin/fulfillment/*` — 403
- Unauthenticated: 401 on all protected routes

### KPIs
- `GET /admin/fulfillment/kpis` returns `avg_lead_time_minutes`, `stuck_in_picking_count`, `dispatched_count_30d`
- Accessible to `inventory` and `customer_service` roles

---

## Scheduled Jobs & Subscribers

### packed-not-shipped job
- Fires notification for orders in `packed` status > 24h
- Does NOT re-notify within 4-hour cooldown window (`last_notified_at` guard)
- No qualifying orders → no notifications sent, job completes cleanly
- DB query fails → `logger.warn`, job does not throw

### low-stock-check subscriber
- Low-stock event fires notification to `purchasing` + `inventory` roles
- Notification module throws → error suppressed (`logger.warn`), subscriber does not crash

### invite-created subscriber (Resend)
- `invite.created` event → Resend API called with correct `RESEND_FROM` address
- `RESEND_API_KEY` missing → error logged, subscriber does not throw
- Invalid email address → handled gracefully

### order-placed subscriber
- `order.placed` event → customer service team notified

---

## Team Task Board

### CRUD
- `POST /admin/team-tasks` — creates task with title, description, status, priority, area, assignee, due_date
- `GET /admin/team-tasks` — returns list of all tasks
- `POST /admin/team-tasks/:id` — updates task fields
- `DELETE /admin/team-tasks/:id` — removes task

### Validation
- Create task without required `title` → 400
- Invalid `status` value → 400
- Invalid `priority` value → 400

---

## RBAC Middleware

- `admin` role bypasses all custom role checks
- User with no role set → 403 on all purchase/fulfillment routes
- Role check is live per-request (no stale cached state)

---

## Edge Cases

- Concurrent dispatch requests on same packed order → only one succeeds (DB constraint on `order_id`)
- packed-not-shipped job: `last_notified_at` write fails after notify → logs warning, does not re-throw
- `getRecipientsByRole` called with a role that has no users → returns empty list, no crash
