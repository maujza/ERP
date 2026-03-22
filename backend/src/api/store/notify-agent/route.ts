import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type NotifyAgentBody = {
  order_id?: string
}

type OrderRecord = {
  id: string
  display_id?: number
  email?: string
  customer_id?: string | null
}

type UserRecord = {
  id: string
  metadata?: Record<string, unknown>
}

const CUSTOMER_SERVICE_ROLE = "customer_service"

// Simple in-memory rate limiter: max 3 requests per order_id per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/** Clear the rate limit state. Intended for use in tests only. */
export function clearRateLimitForTesting(): void {
  rateLimitMap.clear()
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.body as NotifyAgentBody

  if (!order_id || typeof order_id !== "string") {
    return res.status(400).json({ error: "order_id is required" })
  }

  if (!checkRateLimit(order_id)) {
    return res.status(429).json({ error: "Too many requests. Try again later." })
  }

  const query = req.scope.resolve("query") as {
    graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "customer_id"],
    filters: { id: order_id },
  })

  const order = orders[0] as OrderRecord | undefined
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  // Verify order ownership: if a customer is authenticated, ensure the order belongs to them
  const customerId = (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (customerId && order.customer_id && order.customer_id !== customerId) {
    return res.status(403).json({ error: "Forbidden" })
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

  // Fetch users with customer_service role (reads only metadata.role, consistent with admin routes)
  const { data: allUsers } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
  })

  const csUserIds = (allUsers as UserRecord[])
    .filter((u) => {
      const role = u.metadata?.role
      if (typeof role === "string") return role.trim().toLowerCase() === CUSTOMER_SERVICE_ROLE
      if (Array.isArray(role)) return role.map((r) => String(r).trim().toLowerCase()).includes(CUSTOMER_SERVICE_ROLE)
      return false
    })
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
