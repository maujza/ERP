/**
 * invite-created.ts — Subscriber: sends an invitation email when an admin user is invited
 *
 * A "subscriber" in Medusa is a background event handler. Medusa emits events after
 * certain actions (e.g., creating an invite) and subscribers run asynchronously —
 * the API response is already sent before this code runs.
 *
 * This subscriber fires on two events:
 *   - "invite.created" — a new invite was just created via the admin UI
 *   - "invite.resent"  — an existing invite was resent
 *
 * Email delivery strategy (tried in order):
 *   1. Resend HTTP API — used if RESEND_API_KEY and RESEND_FROM are set in .env
 *   2. Medusa Notification module (e.g., SendGrid) — fallback if Resend is not configured
 *
 * Required env vars: MEDUSA_ADMIN_URL (for the invite link), RESEND_API_KEY, RESEND_FROM
 */

// SubscriberArgs — the typed argument object Medusa injects into every subscriber function:
//   { event: { data: T }, container }  where `container` is the DI service locator
// SubscriberConfig — the exported config object that tells Medusa which event(s) to listen for
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

// Modules — an enum of Medusa's built-in module keys
//   Modules.NOTIFICATION resolves the notification module (email/feed/SMS provider hub)
import { Modules } from "@medusajs/framework/utils"

type InviteRecord = {
  id: string
  email: string
  token: string
}

type NotificationModule = {
  createNotifications: (input: {
    to: string
    channel: string
    template: string
    content: { subject: string; html: string }
  }) => Promise<unknown>
}

async function sendViaResend(input: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM

  if (!apiKey || !from) {
    return false
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend invite email failed (${response.status}): ${detail}`)
  }

  return true
}

async function sendInviteEmail(
  inviteId: string,
  container: SubscriberArgs<{ id: string }>["container"]
) {
  const query = container.resolve("query") as {
    graph: (input: {
      entity: string
      fields: string[]
      filters: { id: string }
    }) => Promise<{ data: unknown[] }>
  }

  const { data } = await query.graph({
    entity: "invite",
    fields: ["id", "email", "token"],
    filters: { id: inviteId },
  })

  const invite = data[0] as InviteRecord | undefined
  if (!invite) {
    const logger = container.resolve("logger") as { warn: (msg: string) => void }
    logger.warn(`invite-created: invite ${inviteId} not found, skipping email`)
    return
  }

  const adminUrl =
    process.env.MEDUSA_ADMIN_URL?.replace(/\/$/, "") ||
    process.env.ADMIN_CORS?.split(",")[0]?.trim() ||
    "http://localhost:9000"

  const inviteUrl = `${adminUrl}/app/invite?token=${invite.token}`
  const subject = "Te invitaron a unirte a Aurora"
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px">Bienvenido/a a Aurora</h2>
      <p style="color:#555;margin:0 0 24px">
        Fuiste invitado/a a unirte al panel de administración de Aurora.
        Hacé clic en el botón de abajo para crear tu contraseña y activar tu cuenta.
      </p>
      <a href="${inviteUrl}"
          style="display:inline-block;background:#111;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:6px;font-weight:600">
        Aceptar invitación
      </a>
      <p style="color:#999;font-size:12px;margin:24px 0 0">
        Si no esperabas esta invitación, podés ignorar este correo.<br>
        El enlace expira en 24 horas.
      </p>
    </div>
  `

  const sentWithResend = await sendViaResend({
    to: invite.email,
    subject,
    html,
  })

  if (sentWithResend) {
    return
  }

  const notificationModule = container.resolve(
    Modules.NOTIFICATION
  ) as NotificationModule

  await notificationModule.createNotifications({
    to: invite.email,
    channel: "email",
    template: "invite",
    content: {
      subject,
      html,
    },
  })
}

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await sendInviteEmail(data.id, container)
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
}
