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

// Read metadata.role as a raw lowercase string — no enum validation.
// WA notification roles come from an env var and can be arbitrary strings,
// so we don't restrict to the canonical ROLES enum here.
// NOTE: metadata.notification_roles (array) is no longer supported.
// Users previously using that key must migrate to metadata.role (string).
const getRawRole = (metadata: Record<string, unknown> | undefined): string | null => {
  if (!metadata) return null
  const candidate = metadata.role
  if (typeof candidate !== "string") return null
  const normalized = candidate.trim().toLowerCase()
  return normalized || null
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
  const userRole = getRawRole(user?.metadata)

  const canReceiveByEmail = allowedEmails.length === 0 ? false : allowedEmails.includes(userEmail)
  const canReceiveByRole =
    allowedRoles.length === 0
      ? false
      : userRole !== null && allowedRoles.includes(userRole)

  const noRbacConfigured = allowedEmails.length === 0 && allowedRoles.length === 0
  const canReceive = noRbacConfigured || canReceiveByEmail || canReceiveByRole

  return res.json({
    can_receive: canReceive,
    no_rbac_configured: noRbacConfigured,
    user_email: userEmail || null,
  })
}
