/**
 * order-placed.ts — Subscriber: notifies customer-service staff when a WhatsApp order arrives
 *
 * Listens for the "order.placed" event. Only acts when the order has
 * `metadata.whatsapp_required = true`, which is set during checkout when the
 * customer chooses "pay via WhatsApp" instead of a card.
 *
 * Sends an in-app feed notification to every admin user with the
 * "customer_service" role so they know to follow up via WhatsApp.
 *
 * If no feed notification provider is configured (common in fresh installs),
 * the error is logged as a warning instead of crashing.
 */

// SubscriberArgs, SubscriberConfig — Medusa event bus types (see invite-created.ts for details)
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

// ContainerRegistrationKeys — named constants for Medusa's built-in DI container keys
//   e.g., ContainerRegistrationKeys.LOGGER resolves the server logger
// Modules — enum of Medusa module keys (Modules.NOTIFICATION = notification module)
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// getRecipientsByRole — returns admin user IDs matching a given role (cached 60 s)
import { getRecipientsByRole } from "../lib/notification-recipients"
import { isMissingFeedProviderError, ROLES } from "../lib/notification-helpers"

type OrderRecord = {
  id: string
  display_id?: number
  email?: string
  metadata?: Record<string, unknown>
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query") as {
    graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata"],
    filters: { id: data.id },
  })

  const order = orders[0] as OrderRecord | undefined
  if (!order?.metadata?.whatsapp_required) return

  const csUserIds = await getRecipientsByRole(
    container as Parameters<typeof getRecipientsByRole>[0],
    [ROLES.CUSTOMER_SERVICE]
  )

  const phone = order.metadata.customer_phone as string | undefined
  const paymentMethod = order.metadata.whatsapp_payment_method as string | undefined

  const description =
    `Orden #${order.display_id ?? order.id} · ${order.email ?? "—"}` +
    (phone ? ` · 📱 ${phone}` : "") +
    ` · Método: ${paymentMethod ?? "—"}`

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    warn: (message: string) => void
  }

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

  const recipients = csUserIds.length > 0 ? csUserIds : ["system"]

  try {
    await Promise.all(
      recipients.map((to) =>
        notificationModule.createNotifications({
          to,
          channel: "feed",
          template: "admin-ui",
          resource_id: order.id,
          resource_type: "order",
          data: {
            title: "Nueva orden WhatsApp pendiente",
            description,
          },
        })
      )
    )
  } catch (error) {
    if (!isMissingFeedProviderError(error)) {
      throw error
    }

    logger.warn(
      `Skipping WhatsApp order feed notification for order ${order.id}: no feed notification provider is configured.`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
