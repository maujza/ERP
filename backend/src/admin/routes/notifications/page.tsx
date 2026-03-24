"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BellAlert } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Badge, Container, Heading, Text, toast } from "@medusajs/ui"
import { sdk } from "../../lib/client"

export const config = defineRouteConfig({
  label: "Notificaciones",
  icon: BellAlert,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminNotification = {
  id: string
  to: string
  channel: string
  template: string
  resource_id?: string | null
  resource_type?: string | null
  created_at: string
  data?: {
    title?: string
    description?: string
  } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

/** Extract numeric display_id from strings like "Orden #946 · ..." */
function parseDisplayId(description: string): number | null {
  const match = description.match(/#(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

async function resolveOrderUrl(notification: AdminNotification): Promise<string | null> {
  // Already have a direct order ID
  if (notification.resource_type === "order" && notification.resource_id) {
    return `/app/orders/${notification.resource_id}`
  }

  // Fallback: parse display_id from description and look up the order
  const description = notification.data?.description ?? ""
  const displayId = parseDisplayId(description)
  if (!displayId) return null

  try {
    const result = await sdk.client.fetch<{ orders: { id: string }[] }>(
      "/admin/orders",
      { query: { display_id: displayId, fields: "id", limit: 1 } }
    )
    const order = result.orders?.[0]
    return order ? `/app/orders/${order.id}` : null
  } catch {
    return null
  }
}

function typeLabel(n: AdminNotification): string {
  const title = n.data?.title ?? ""
  if (title.includes("WhatsApp")) return "WhatsApp"
  if (title.includes("empaquetada")) return "Fulfillment"
  if (title.includes("atención") || title.includes("Atención")) return "Cliente"
  if (title.includes("stock")) return "Inventario"
  return "Sistema"
}

function typeBadge(n: AdminNotification) {
  const label = typeLabel(n)
  const colorMap: Record<string, "green" | "blue" | "orange" | "grey" | "red"> = {
    WhatsApp: "green",
    Fulfillment: "blue",
    Cliente: "orange",
    Inventario: "grey",
    Sistema: "grey",
  }
  return <Badge color={colorMap[label] ?? "grey"} size="xsmall">{label}</Badge>
}

// ─── NotificationRow ──────────────────────────────────────────────────────────

function NotificationRow({ notification }: { notification: AdminNotification }) {
  const hasOrderLink =
    (notification.resource_type === "order" && !!notification.resource_id) ||
    !!parseDisplayId(notification.data?.description ?? "")

  const title = notification.data?.title ?? "Notificación"
  const description = notification.data?.description ?? ""

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    const url = await resolveOrderUrl(notification)
    if (url) {
      window.location.href = url
    } else {
      toast.error("No se pudo encontrar la orden.")
    }
  }

  const inner = (
    <div className="flex items-start justify-between gap-4 py-3 px-4">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Text size="small" weight="plus" className="truncate">
            {title}
          </Text>
          {typeBadge(notification)}
        </div>
        {description && (
          <Text size="xsmall" className="text-ui-fg-subtle line-clamp-2">
            {description}
          </Text>
        )}
      </div>
      <Text size="xsmall" className="text-ui-fg-muted whitespace-nowrap shrink-0">
        {relativeTime(notification.created_at)}
      </Text>
    </div>
  )

  if (hasOrderLink) {
    return (
      <a
        href="#"
        onClick={handleClick}
        className="block border-b border-ui-border-base last:border-0 hover:bg-ui-bg-subtle transition-colors cursor-pointer"
      >
        {inner}
      </a>
    )
  }

  return (
    <div className="border-b border-ui-border-base last:border-0">
      {inner}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () =>
      sdk.client.fetch<{ notifications: AdminNotification[]; count: number }>(
        "/admin/notifications",
        {
          query: {
            channel: "feed",
            limit: 50,
            order: "-created_at",
            fields: "id,to,channel,template,data,resource_id,resource_type,created_at",
          },
        }
      ),
    refetchInterval: 30_000,
  })

  const notifications = data?.notifications ?? []

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Heading level="h1">Notificaciones</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Alertas del sistema — haz clic en una notificación de orden para ir al pedido.
        </Text>
      </div>

      <Container className="p-0 overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto">
        {isLoading && (
          <div className="py-8 text-center">
            <Text size="small" className="text-ui-fg-muted">Cargando...</Text>
          </div>
        )}

        {isError && (
          <div className="py-8 text-center">
            <Text size="small" className="text-ui-fg-subtle">
              Error al cargar notificaciones.
            </Text>
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="py-8 text-center">
            <Text size="small" className="text-ui-fg-muted">
              Sin notificaciones recientes.
            </Text>
          </div>
        )}

        {!isLoading && !isError && notifications.length > 0 && (
          <div>
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </div>
        )}
      </Container>

      {!isLoading && data?.count != null && data.count > 0 && (
        <Text size="xsmall" className="text-ui-fg-muted text-right">
          {notifications.length} de {data.count} notificaciones
        </Text>
      )}
    </div>
  )
}
