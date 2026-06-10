# backend/src/modules — Custom Medusa Modules

A **module** in Medusa 2.x is a self-contained package of business logic and database models. It has its own database tables, service methods, and migrations — fully isolated from other modules.

Each module directory must export a default from its `index.ts` that tells Medusa how to load it. Modules are registered in `medusa-config.ts` under the `modules[]` array.

## Modules in this project

### `purchaseDepartment/`

Manages the procurement and fulfillment lifecycle.

**What it does:**
- Tracks **Suppliers** (contact info, lead time, fill rate)
- Manages **Purchase Orders** and their line items
- Records **Fulfillment** steps: pick → pack → dispatch
- Logs stock adjustments in **StockAdjustmentLog**

**Key files:**
- `models/` — database table definitions (Supplier, PurchaseOrder, PurchaseOrderItem, FulfillmentRecord, StockAdjustmentLog)
- `service.ts` — business logic methods exposed to API routes and workflows
- `migrations/` — SQL migration files run by `npx medusa db:migrate`

**API routes that use it:** `/api/admin/purchase/`, `/api/admin/fulfillment/`

---

### `taskBoard/`

A simple team task board (kanban-style) for internal operations.

**What it does:**
- Creates and manages **Tasks** with title, description, status, priority, area, assignee, and due date

**Key files:**
- `models/Task.ts` — database model
- `service.ts` — CRUD methods
- `migrations/Migration20260406000001.ts`

**API routes that use it:** `/api/admin/team-tasks/`

---

### `image-upload/`

A custom Medusa file provider that stores product images in **Cloudflare R2** instead of the local filesystem.

**What it does:**
- Implements `AbstractFileProviderService` (Medusa's file provider interface)
- Processes images with **Sharp** before upload: images >300 KB or >1600 px wide are resized and converted to WebP (quality 82)
- Rejects non-image file types with a clear error
- Registered in `medusa-config.ts` only when `R2_BUCKET` env var is set

**Key files:**
- `index.ts` — exports the module definition (tells Medusa this is a file provider)
- `service.ts` — the upload/delete/download implementation using `@aws-sdk/client-s3` and `sharp`

**Required env vars:** `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

---

## Adding a new module

1. Create `src/modules/<name>/`
2. Add a data model in `models/`
3. Add `service.ts` extending `MedusaService`
4. Add `index.ts` exporting `Module("<name>", { service: YourService })`
5. Register in `medusa-config.ts`: `{ resolve: "./src/modules/<name>" }`
6. Generate and run migrations: `npx medusa db:generate <name>` then `npx medusa db:migrate`

See [Medusa docs — Modules](https://docs.medusajs.com/learn/fundamentals/modules) for the full reference.
