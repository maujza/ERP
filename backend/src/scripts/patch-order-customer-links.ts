/**
 * One-time patch script: links existing orders to their customers by email
 * using a direct SQL UPDATE (Medusa's updateOrders service does not expose
 * customer_id as an updatable field).
 *
 * Run with:
 *   npx medusa exec ./src/scripts/patch-order-customer-links.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function patchOrderCustomerLinks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // Resolve Medusa's internal knex/pg connection (registered as "pg_connection")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pgConnection = container.resolve<any>("pg_connection")

  logger.info("Patching order → customer links by email (SQL)…")

  const result = await pgConnection.raw(`
    UPDATE "order" o
    SET customer_id = c.id
    FROM customer c
    WHERE LOWER(o.email) = LOWER(c.email)
      AND o.customer_id IS NULL
  `)

  const patched = result.rowCount ?? 0
  logger.info(`  Patched: ${patched} orders`)
  logger.info("Done.")
}
