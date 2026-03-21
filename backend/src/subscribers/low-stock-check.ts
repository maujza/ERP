import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

// Default threshold (units). Override via LOW_STOCK_THRESHOLD env var.
// Per-variant thresholds are a Sprint 3 enhancement.
const DEFAULT_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5)

type InventoryLevelRecord = {
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
}

type UserRecord = {
  id: string
  metadata?: Record<string, unknown>
}

const NOTIFY_ROLES = ["purchasing", "inventory"]

function readRole(metadata: Record<string, unknown> | undefined): string | null {
  const candidate = metadata?.role
  if (typeof candidate === "string") return candidate.trim().toLowerCase()
  return null
}

// Suppresses all errors — a missed low-stock alert must never crash an inventory update.
export async function lowStockCheckHandler({
  event: { data },
  container,
}: SubscriberArgs<{ inventory_item_id: string; location_id: string }>) {
  try {
    const inventoryService = container.resolve(Modules.INVENTORY) as {
      listInventoryLevels: (
        filter: Record<string, any>,
        config?: Record<string, any>
      ) => Promise<InventoryLevelRecord[]>
    }

    const levels = await inventoryService.listInventoryLevels({
      inventory_item_id: [data.inventory_item_id],
      location_id: [data.location_id],
    })

    const level = levels[0]
    if (!level) return
    if (level.stocked_quantity > DEFAULT_THRESHOLD) return

    // Find users with purchasing or inventory roles to notify
    const query = container.resolve("query") as {
      graph: (input: {
        entity: string
        fields: string[]
        filters?: Record<string, unknown>
      }) => Promise<{ data: unknown[] }>
    }

    const { data: allUsers } = await query.graph({
      entity: "user",
      fields: ["id", "metadata"],
    })

    const recipientIds = (allUsers as UserRecord[])
      .filter((u) => NOTIFY_ROLES.includes(readRole(u.metadata) ?? ""))
      .map((u) => u.id)

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
  } catch (err: any) {
    const logger = container.resolve("logger") as { warn: (msg: string, meta?: any) => void }
    logger.warn("[low-stock-check] Failed to process inventory.updated event", {
      inventory_item_id: data.inventory_item_id,
      error: err?.message ?? String(err),
    })
  }
}

export default lowStockCheckHandler

export const config: SubscriberConfig = {
  event: "inventory.updated",
}
