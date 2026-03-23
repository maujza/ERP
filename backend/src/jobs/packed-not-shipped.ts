import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../modules/purchaseDepartment/service"
import { getRecipientsByRole } from "../lib/notification-recipients"

// Alert threshold: orders packed longer than this many hours trigger a notification.
const ALERT_AFTER_HOURS = 24

// Cooldown: don't re-notify the same order within this many hours.
const COOLDOWN_HOURS = 4

type FulfillmentRecordRow = {
  id: string
  order_id: string
  status: "pending" | "picking" | "packed" | "dispatched" | "cancelled"
  updated_at: string | Date
  last_notified_at: string | Date | null
}

// Wraps an async fn so errors are logged + suppressed rather than crashing the job.
async function withSuppressedErrors(
  label: string,
  container: MedusaContainer,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn()
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err)
    const logger = container.resolve("logger") as { warn: (msg: string, meta?: Record<string, unknown>) => void }
    logger.warn(`[packed-not-shipped] ${label}`, { error })
  }
}

export default async function packedNotShippedJob(container: MedusaContainer) {
  await withSuppressedErrors("Unhandled error in job body", container, async () => {
    const fulfillmentService = container.resolve(
      PURCHASE_DEPARTMENT_MODULE
    ) as PurchaseDepartmentModuleService

    const logger = container.resolve("logger") as { warn: (msg: string, meta?: Record<string, unknown>) => void }

    // Query fulfillment records in 'packed' status
    const records = (await fulfillmentService.listFulfillmentRecords({ status: "packed" })) as FulfillmentRecordRow[]

    const alertCutoff = new Date(Date.now() - ALERT_AFTER_HOURS * 60 * 60 * 1000)
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)

    const notificationModule = container.resolve(Modules.NOTIFICATION) as {
      createNotifications: (input: {
        to: string
        channel: string
        template: string
        data: Record<string, unknown>
        resource_id?: string
        resource_type?: string
      }) => Promise<unknown>
    }

    // Find inventory role users to notify using shared cached helper
    const inventoryUserIds = await getRecipientsByRole(
      container as Parameters<typeof getRecipientsByRole>[0],
      ["inventory"]
    )

    const recipients = inventoryUserIds.length > 0 ? inventoryUserIds : ["system"]

    for (const record of records) {
      const updatedAt = new Date(record.updated_at)
      if (updatedAt > alertCutoff) continue // not stale yet

      const lastNotified: Date | null = record.last_notified_at
        ? new Date(record.last_notified_at)
        : null

      if (lastNotified && lastNotified > cooldownCutoff) continue // within cooldown

      await withSuppressedErrors(
        `Failed to notify for order ${record.order_id}`,
        container,
        async () => {
          await Promise.all(
            recipients.map((to) =>
              notificationModule.createNotifications({
                to,
                channel: "feed",
                template: "admin-ui",
                resource_id: record.order_id,
                resource_type: "order",
                data: {
                  title: "Orden empaquetada sin despachar",
                  description: `La orden ${record.order_id} lleva más de ${ALERT_AFTER_HOURS}h en estado "empaquetada".`,
                  order_id: record.order_id,
                  fulfillment_record_id: record.id,
                },
              })
            )
          )

          // Update last_notified_at; if this write fails, guard with its own try/catch
          // so cooldown doesn't fail to engage on the next run.
          try {
            await fulfillmentService.updateFulfillmentRecords({
              id: record.id,
              last_notified_at: new Date(),
            })
          } catch (writeErr: unknown) {
            const error = writeErr instanceof Error ? writeErr.message : String(writeErr)
            logger.warn(
              `[packed-not-shipped] last_notified_at write failed for ${record.id}`,
              { error }
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
