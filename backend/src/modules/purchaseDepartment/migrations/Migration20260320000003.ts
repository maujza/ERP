import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260320000003 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "fulfillment_record" (
        "id" text NOT NULL,
        "order_id" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending','picking','packed','dispatched','cancelled')),
        "pick_list" jsonb NULL,
        "packed_weight" numeric(15,4) NULL,
        "packed_dimensions" text NULL,
        "tracking_number" text NULL,
        "last_notified_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "fulfillment_record_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX "fulfillment_record_order_id_unique" ON "fulfillment_record" ("order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "fulfillment_record";`)
  }
}
