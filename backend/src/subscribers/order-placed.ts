import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getRecipientsByRole } from "../lib/notification-recipients"

type OrderRecord = {
  id: string
  display_id?: number
  email?: string
  metadata?: Record<string, unknown>
}

const CUSTOMER_SERVICE_ROLE = "customer_service"

function isMissingFeedProviderError(error: unknown): boolean {
  return error instanceof Error &&
    error.message.includes("Could not find a notification provider for channel: feed")
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
    [CUSTOMER_SERVICE_ROLE]
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
