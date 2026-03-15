import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260306012227 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "purchase_order" ("id" text not null, "supplier_id" text not null, "reference_number" text null, "status" text check ("status" in ('draft', 'submitted', 'received', 'cancelled')) not null default 'draft', "notes" text null, "expected_delivery_date" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_deleted_at" ON "purchase_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "purchase_order_item" ("id" text not null, "variant_id" text not null, "quantity" integer not null, "unit_cost" integer not null, "received_quantity" integer not null default 0, "purchase_order_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "purchase_order_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_item_purchase_order_id" ON "purchase_order_item" ("purchase_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_purchase_order_item_deleted_at" ON "purchase_order_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "supplier" ("id" text not null, "name" text not null, "email" text null, "phone" text null, "address" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "supplier_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_supplier_deleted_at" ON "supplier" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "purchase_order_item" add constraint "purchase_order_item_purchase_order_id_foreign" foreign key ("purchase_order_id") references "purchase_order" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "purchase_order_item" drop constraint if exists "purchase_order_item_purchase_order_id_foreign";`);

    this.addSql(`drop table if exists "purchase_order" cascade;`);

    this.addSql(`drop table if exists "purchase_order_item" cascade;`);

    this.addSql(`drop table if exists "supplier" cascade;`);
  }

}
