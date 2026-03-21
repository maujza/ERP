import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../modules/purchaseDepartment/service"

// Alert threshold: orders packed longer than this many hours trigger a notification.
const ALERT_AFTER_HOURS = 24

// Cooldown: don't re-notify the same order within this many hours.
const COOLDOWN_HOURS = 4

// Wraps an async fn so errors are logged + suppressed rather than crashing the job.
async function withSuppressedErrors(
  label: string,
  container: MedusaContainer,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn()
  } catch (err: any) {
    const logger = container.resolve("logger") as { warn: (msg: string, meta?: any) => void }
    logger.warn(`[packed-not-shipped] ${label}`, { error: err?.message ?? String(err) })
  }
}

export default async function packedNotShippedJob(container: MedusaContainer) {
  await withSuppressedErrors("Unhandled error in job body", container, async () => {
    const fulfillmentService = container.resolve(
      PURCHASE_DEPARTMENT_MODULE
    ) as PurchaseDepartmentModuleService

    const logger = container.resolve("logger") as { warn: (msg: string, meta?: any) => void }

    const query = container.resolve("query") as {
      graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
    }

    // Query fulfillment records in 'packed' status
    const records = await fulfillmentService.listFulfillmentRecords({ status: "packed" })

    const alertCutoff = new Date(Date.now() - ALERT_AFTER_HOURS * 60 * 60 * 1000)
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)

    const notificationModule = container.resolve(Modules.NOTIFICATION) as {
      createNotifications: (input: {
        to: string
        channel: string
        template: string
        data: Record<string, unknown>
      }) => Promise<unknown>
    }

    // Find inventory role users to notify
    const { data: allUsers } = await query.graph({
      entity: "user",
      fields: ["id", "metadata"],
    })

    const inventoryUserIds = (allUsers as { id: string; metadata?: any }[])
      .filter((u) => {
        const role = u.metadata?.role
        return typeof role === "string" && role.trim().toLowerCase() === "inventory"
      })
      .map((u) => u.id)

    const recipients = inventoryUserIds.length > 0 ? inventoryUserIds : ["system"]

    for (const record of records) {
      const updatedAt = new Date((record as any).updated_at)
      if (updatedAt > alertCutoff) continue // not stale yet

      const lastNotified: Date | null = (record as any).last_notified_at
        ? new Date((record as any).last_notified_at)
        : null

      if (lastNotified && lastNotified > cooldownCutoff) continue // within cooldown

      await withSuppressedErrors(
        `Failed to notify for order ${(record as any).order_id}`,
        container,
        async () => {
          await Promise.all(
            recipients.map((to) =>
              notificationModule.createNotifications({
                to,
                channel: "feed",
                template: "admin-ui",
                data: {
                  title: "Orden empaquetada sin despachar",
                  description: `La orden ${(record as any).order_id} lleva más de ${ALERT_AFTER_HOURS}h en estado "empaquetada".`,
                  order_id: (record as any).order_id,
                  fulfillment_record_id: (record as any).id,
                },
              })
            )
          )

          // Update last_notified_at; if this write fails, guard with its own try/catch
          // so cooldown doesn't fail to engage on the next run.
          try {
            await fulfillmentService.updateFulfillmentRecords({
              id: (record as any).id,
              last_notified_at: new Date(),
            })
          } catch (writeErr: any) {
            logger.warn(
              `[packed-not-shipped] last_notified_at write failed for ${(record as any).id}`,
              { error: writeErr?.message }
            )
          }
        }
      )
    }
  })
}

export const config = {
  name: "packed-not-shipped",
  schedule: "0 * * * *", // hourly
}
