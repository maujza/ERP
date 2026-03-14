import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260314000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "purchase_order_item" ALTER COLUMN "unit_cost" TYPE numeric(15,4) USING "unit_cost"::numeric;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "purchase_order_item" ALTER COLUMN "unit_cost" TYPE integer USING "unit_cost"::integer;`
    )
  }
}
