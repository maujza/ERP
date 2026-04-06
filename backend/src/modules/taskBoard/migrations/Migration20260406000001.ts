import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260406000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "task_board_task" (
        "id" text NOT NULL,
        "title" text NOT NULL,
        "description" text NULL,
        "status" text NOT NULL DEFAULT 'todo'
          CHECK ("status" IN ('todo','in_progress','blocked','done')),
        "priority" text NOT NULL DEFAULT 'medium'
          CHECK ("priority" IN ('low','medium','high','urgent')),
        "area" text NOT NULL DEFAULT 'operations'
          CHECK ("area" IN ('operations','purchasing','inventory','catalog','customers','marketing')),
        "assignee" text NULL,
        "due_date" timestamptz NULL,
        "position" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "task_board_task_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_task_board_task_deleted_at" ON "task_board_task" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_task_board_task_status_position" ON "task_board_task" ("status", "position") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "task_board_task";`)
  }
}

