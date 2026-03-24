import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260320000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "stock_adjustment_log" (
        "id" text NOT NULL,
        "variant_id" text NOT NULL,
        "location_id" text NOT NULL,
        "delta" numeric(15,4) NOT NULL,
        "reason_code" text NOT NULL
          CHECK ("reason_code" IN (
            'po_receive','order_pick','manual_adjustment','return_restock','correction'
          )),
        "actor_id" text NULL,
        "purchase_order_id" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "stock_adjustment_log_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX "stock_adjustment_log_variant_id_idx" ON "stock_adjustment_log" ("variant_id");`
    )
    this.addSql(
      `CREATE INDEX "stock_adjustment_log_purchase_order_id_idx" ON "stock_adjustment_log" ("purchase_order_id");`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "stock_adjustment_log";`)
  }
}
