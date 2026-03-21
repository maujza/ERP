import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260320000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "discrepancy_count" integer NOT NULL DEFAULT 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "purchase_order" DROP COLUMN IF EXISTS "discrepancy_count";`
    )
  }
}
