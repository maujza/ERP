import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type UserRecord = {
  email?: string
  metadata?: Record<string, unknown>
}

const parseCsv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

const readRolesFromMetadata = (metadata: Record<string, unknown> | undefined) => {
  if (!metadata) return [] as string[]

  const candidate = metadata.notification_roles ?? metadata.role
  if (Array.isArray(candidate)) {
    return candidate
      .map((role) => String(role).trim().toLowerCase())
      .filter(Boolean)
  }

  if (typeof candidate === "string") {
    return [candidate.trim().toLowerCase()].filter(Boolean)
  }

  return [] as string[]
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actorId = req.auth_context.actor_id
  const allowedEmails = parseCsv(process.env.WHATSAPP_NOTIFICATION_RECIPIENTS)
  const allowedRoles = parseCsv(process.env.WHATSAPP_NOTIFICATION_ROLES)

  const query = req.scope.resolve("query") as {
    graph: (input: {
      entity: string
      fields: string[]
      filters: { id: string }
    }) => Promise<{ data: UserRecord[] }>
  }

  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "email", "metadata"],
    filters: { id: actorId },
  })

  const user = data[0]
  const userEmail = (user?.email ?? "").toLowerCase()
  const userRoles = readRolesFromMetadata(user?.metadata)

  const canReceiveByEmail = allowedEmails.length === 0 ? false : allowedEmails.includes(userEmail)
  const canReceiveByRole =
    allowedRoles.length === 0
      ? false
      : userRoles.some((role) => allowedRoles.includes(role))

  const noRbacConfigured = allowedEmails.length === 0 && allowedRoles.length === 0
  const canReceive = noRbacConfigured || canReceiveByEmail || canReceiveByRole

  return res.json({
    can_receive: canReceive,
    no_rbac_configured: noRbacConfigured,
    user_email: userEmail || null,
  })
}
