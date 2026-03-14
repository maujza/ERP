# Database Migrations — Purchase Department Module

This document describes the database changes introduced by the Purchase Department feature
and the steps required to apply them to a new or existing environment.

---

## What gets created

### Tables (via `Migration20260306012227`)

| Table | Description |
|-------|-------------|
| `supplier` | Vendors/suppliers — name, email, phone, address, notes |
| `purchase_order` | Purchase orders linked to a supplier — reference number, status, notes, expected delivery date |
| `purchase_order_item` | Line items on a purchase order — variant, quantity, unit cost, received quantity |

**Status values for `purchase_order`:** `draft` → `submitted` → `received` (or `cancelled` at any point before received)

### Column change (via `Migration20260314000001`)

`purchase_order_item.unit_cost` is altered from `integer` to `numeric(15,4)` to support
decimal prices (e.g. `1234.5678`).

### Link tables (created automatically by Medusa on `db:sync-links` / server start)

| Link | Description |
|------|-------------|
| `purchase_order_item` ↔ `product_variant` | Connects each PO line item to a Medusa product variant |
| `purchase_order` ↔ `price_list` | Optionally connects a PO to a Medusa price list |

Medusa manages these pivot tables internally — you do not need to write SQL for them.

---

## How to apply migrations

### Option A — Docker (recommended for this project)

The server runs migrations automatically on startup. Rebuild and restart the backend container:

```bash
docker compose up --build backend -d
docker compose logs backend -f
# Wait for: "Server is ready on port: 9000"
```

Medusa runs `medusa db:migrate` as part of the startup sequence. Both migration classes
will be applied in order if they haven't run yet.

---

### Option B — Local development (without Docker)

The database runs inside Docker on port **5433** (mapped from the container's 5432).
Temporarily point your local `.env` at it:

```bash
# In backend/.env, change:
DATABASE_URL=postgres://postgres:postgres@localhost:5433/medusa
```

Then run:

```bash
cd backend
npm run db:migrate
```

After the migration, revert `DATABASE_URL` back to its original value if needed.

---

### Option C — Manual SQL (emergency / production)

If you need to apply the schema without running the Medusa CLI, execute the following
statements in order against the target database:

```sql
-- Migration20260306012227: create tables
CREATE TABLE IF NOT EXISTS "supplier" (
  "id"         text        NOT NULL,
  "name"       text        NOT NULL,
  "email"      text,
  "phone"      text,
  "address"    text,
  "notes"      text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at"
  ON "supplier" ("deleted_at") WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS "purchase_order" (
  "id"                     text        NOT NULL,
  "supplier_id"            text        NOT NULL,
  "reference_number"       text,
  "status"                 text        NOT NULL DEFAULT 'draft'
                           CHECK ("status" IN ('draft','submitted','received','cancelled')),
  "notes"                  text,
  "expected_delivery_date" timestamptz,
  "created_at"             timestamptz NOT NULL DEFAULT now(),
  "updated_at"             timestamptz NOT NULL DEFAULT now(),
  "deleted_at"             timestamptz,
  CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_purchase_order_deleted_at"
  ON "purchase_order" ("deleted_at") WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS "purchase_order_item" (
  "id"                  text    NOT NULL,
  "variant_id"          text    NOT NULL,
  "quantity"            integer NOT NULL,
  "unit_cost"           integer NOT NULL,  -- will be changed in next migration
  "received_quantity"   integer NOT NULL DEFAULT 0,
  "purchase_order_id"   text    NOT NULL,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  "deleted_at"          timestamptz,
  CONSTRAINT "purchase_order_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_item_purchase_order_id_foreign"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order" ("id") ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_purchase_order_item_purchase_order_id"
  ON "purchase_order_item" ("purchase_order_id") WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_purchase_order_item_deleted_at"
  ON "purchase_order_item" ("deleted_at") WHERE deleted_at IS NULL;

-- Migration20260314000001: change unit_cost to decimal
ALTER TABLE "purchase_order_item"
  ALTER COLUMN "unit_cost" TYPE numeric(15,4) USING "unit_cost"::numeric;
```

---

## One-time data patch (existing environments only)

If orders were created before customers were linked by `customer_id`, run the patch script
to back-fill the FK using order email matching:

```bash
cd backend
npx medusa exec ./src/scripts/patch-order-customer-links.ts
```

This runs a single `UPDATE` that sets `order.customer_id` for all orders where the email
matches a customer record and `customer_id` is currently `NULL`. It is idempotent and safe
to run multiple times.

---

## Rollback

To undo the migrations (drops all purchase department data):

```bash
cd backend
npm run db:migrate -- --revert
```

Or manually:

```sql
ALTER TABLE "purchase_order_item"
  ALTER COLUMN "unit_cost" TYPE integer USING "unit_cost"::integer;

ALTER TABLE "purchase_order_item"
  DROP CONSTRAINT IF EXISTS "purchase_order_item_purchase_order_id_foreign";

DROP TABLE IF EXISTS "purchase_order_item" CASCADE;
DROP TABLE IF EXISTS "purchase_order" CASCADE;
DROP TABLE IF EXISTS "supplier" CASCADE;
```
