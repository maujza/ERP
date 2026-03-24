import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260322000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "fill_rate" integer DEFAULT NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "supplier" DROP COLUMN IF EXISTS "fill_rate";`)
  }
}
