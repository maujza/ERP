/**
 * low-stock-check.ts — Subscriber: sends an in-app alert when a product variant runs low on stock
 *
 * Listens for "inventory.updated" events, which Medusa emits whenever inventory
 * levels change (sales, manual adjustments, receiving purchase orders, etc.).
 *
 * If stocked_quantity drops to or below LOW_STOCK_THRESHOLD (default: 5 units),
 * it sends an in-app "feed" notification to all admin users with the
 * "purchasing" or "inventory" role.
 *
 * All errors are silently logged — a missed stock alert must never crash an
 * inventory update operation.
 *
 * Optional env var: LOW_STOCK_THRESHOLD (integer, default 5)
 */

// SubscriberArgs, SubscriberConfig — Medusa event bus types (see invite-created.ts for details)
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

// Modules — enum of Medusa built-in module keys; used to resolve services from the DI container
//   Modules.INVENTORY — resolves the inventory service (stock level queries)
//   Modules.NOTIFICATION — resolves the notification module (sends alerts)
import { Modules } from "@medusajs/framework/utils"

// getRecipientsByRole — looks up admin user IDs that hold a given role (cached for 60 s)
import { getRecipientsByRole } from "../lib/notification-recipients"

// Default threshold (units). Override via LOW_STOCK_THRESHOLD env var.
// Per-variant thresholds are a Sprint 3 enhancement.
const DEFAULT_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5)

type InventoryLevelRecord = {
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
}

const NOTIFY_ROLES = ["purchasing", "inventory"]

// Suppresses all errors — a missed low-stock alert must never crash an inventory update.
export async function lowStockCheckHandler({
  event: { data },
  container,
}: SubscriberArgs<{ inventory_item_id: string; location_id: string }>) {
  try {
    const inventoryService = container.resolve(Modules.INVENTORY) as {
      listInventoryLevels: (
        filter: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => Promise<InventoryLevelRecord[]>
    }

    const levels = await inventoryService.listInventoryLevels({
      inventory_item_id: [data.inventory_item_id],
      location_id: [data.location_id],
    })

    const level = levels[0]
    if (!level) return
    if (level.stocked_quantity > DEFAULT_THRESHOLD) return

    const recipientIds = await getRecipientsByRole(
      container as Parameters<typeof getRecipientsByRole>[0],
      NOTIFY_ROLES
    )

    const notificationModule = container.resolve(Modules.NOTIFICATION) as {
      createNotifications: (input: {
        to: string
        channel: string
        template: string
        data: Record<string, unknown>
      }) => Promise<unknown>
    }

    const recipients = recipientIds.length > 0 ? recipientIds : ["system"]

    await Promise.all(
      recipients.map((to) =>
        notificationModule.createNotifications({
          to,
          channel: "feed",
          template: "admin-ui",
          data: {
            title: "Stock bajo",
            description: `Quedan ${level.stocked_quantity} unidades (umbral: ${DEFAULT_THRESHOLD}). Ítem: ${data.inventory_item_id}`,
            inventory_item_id: data.inventory_item_id,
            location_id: data.location_id,
            stocked_quantity: level.stocked_quantity,
            threshold: DEFAULT_THRESHOLD,
          },
        })
      )
    )
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err)
    const logger = container.resolve("logger") as { warn: (msg: string, meta?: Record<string, unknown>) => void }
    logger.warn("[low-stock-check] Failed to process inventory.updated event", {
      inventory_item_id: data.inventory_item_id,
      error,
    })
  }
}

export default lowStockCheckHandler

export const config: SubscriberConfig = {
  event: "inventory.updated",
}
