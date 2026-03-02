import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

type OrderRecord = {
  id: string
  display_id?: number
  email?: string
  metadata?: Record<string, unknown>
}

type UserRecord = {
  id: string
  metadata?: Record<string, unknown>
}

const CUSTOMER_SERVICE_ROLE = "customer_service"

function readRoles(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) return []
  const candidate = metadata.notification_roles ?? metadata.role
  if (Array.isArray(candidate)) {
    return candidate.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
  }
  if (typeof candidate === "string") {
    return [candidate.trim().toLowerCase()].filter(Boolean)
  }
  return []
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

  // Find users with the customer_service role
  const { data: allUsers } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
  })

  const csUserIds = (allUsers as UserRecord[])
    .filter((u) => readRoles(u.metadata).includes(CUSTOMER_SERVICE_ROLE))
    .map((u) => u.id)

  const phone = order.metadata.customer_phone as string | undefined
  const paymentMethod = order.metadata.whatsapp_payment_method as string | undefined

  const description =
    `Orden #${order.display_id ?? order.id} · ${order.email ?? "—"}` +
    (phone ? ` · 📱 ${phone}` : "") +
    ` · Método: ${paymentMethod ?? "—"}`

  const notificationModule = container.resolve(Modules.NOTIFICATION) as {
    createNotifications: (input: {
      to: string
      channel: string
      template: string
      data: Record<string, unknown>
    }) => Promise<unknown>
  }

  const recipients = csUserIds.length > 0 ? csUserIds : [""]

  await Promise.all(
    recipients.map((to) =>
      notificationModule.createNotifications({
        to,
        channel: "feed",
        template: "admin-ui",
        data: {
          title: "Nueva orden WhatsApp pendiente",
          description,
        },
      })
    )
  )
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
