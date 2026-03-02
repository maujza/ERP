import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type NotifyAgentBody = {
  order_id?: string
}

type OrderRecord = {
  id: string
  display_id?: number
  email?: string
}

type UserRecord = {
  id: string
  metadata?: Record<string, unknown>
}

const CUSTOMER_SERVICE_ROLE = "customer_service"

function readRoles(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) return []
  const candidate = metadata.notification_roles ?? metadata.role
  if (Array.isArray(candidate)) return candidate.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
  if (typeof candidate === "string") return [candidate.trim().toLowerCase()].filter(Boolean)
  return []
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.body as NotifyAgentBody

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required" })
  }

  const query = req.scope.resolve("query") as {
    graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email"],
    filters: { id: order_id },
  })

  const order = orders[0] as OrderRecord | undefined
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  const description =
    `Orden #${order.display_id ?? order.id} · ${order.email ?? "—"} · ` +
    `El cliente solicitó atención desde la confirmación de pedido.`

  const notificationModule = req.scope.resolve(Modules.NOTIFICATION) as {
    createNotifications: (input: {
      to: string
      channel: string
      template: string
      resource_id?: string
      resource_type?: string
      data: Record<string, unknown>
    }) => Promise<unknown>
  }

  const { data: allUsers } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
  })

  const csUserIds = (allUsers as UserRecord[])
    .filter((u) => readRoles(u.metadata).includes(CUSTOMER_SERVICE_ROLE))
    .map((u) => u.id)

  const recipients = csUserIds.length > 0 ? csUserIds : [""]

  await Promise.all(
    recipients.map((to) =>
      notificationModule.createNotifications({
        to,
        channel: "feed",
        template: "admin-ui",
        resource_id: order.id,
        resource_type: "order",
        data: {
          title: "Atención solicitada por cliente",
          description,
        },
      })
    )
  )

  return res.json({ ok: true })
}
