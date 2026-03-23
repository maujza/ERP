import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Spinner } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { sdk } from "../../lib/client"
import { buildTrendPolylinePoints } from "./chart-utils"

type DashboardOrder = {
  id: string
  email?: string
  created_at?: string
  currency_code?: string
  display_id?: number
  fulfillment_status?: string
  payment_status?: string
  status?: string
  total?: number
  sales_channel_id?: string
  metadata?: Record<string, unknown>
}

type RevenuePoint = {
  amount: number
  month: string
}

type WeeklyPoint = {
  week: string
  value: number
}

type DailyPoint = {
  day: string
  value: number
}

type StatusPoint = {
  label: string
  percent: number
  total: number
}

type TopCustomerPoint = {
  email: string
  revenue: number
}

type SalesChannelPoint = {
  channelId: string
  name: string
  orders: number
  revenue: number
}

type DashboardData = {
  avgOrderValue: number
  channelBreakdown: SalesChannelPoint[]
  currencyCode: string
  customersCount: number
  dailyOrderTrend: DailyPoint[]
  donutSegments: string
  fulfilledCount: number
  fulfillmentRate: number
  lastMonthRevenue: number
  latestOrders: DashboardOrder[]
  momGrowth: number
  ordersCount: number
  paidCount: number
  paymentMix: StatusPoint[]
  paymentRate: number
  pendingOrders: number
  productsCount: number
  revenue: number
  revenuePoints: string
  revenueTrend: RevenuePoint[]
  sampleSize: number
  avgLeadTimeMinutes: number | null
  stuckInPickingCount: number
  thisMonthRevenue: number
  topCustomers: TopCustomerPoint[]
  weeklyOrderTrend: WeeklyPoint[]
  workflowMix: StatusPoint[]
}

const ORDER_SAMPLE_SIZE = 500
const DONUT_COLORS = ["#f97316", "#fb923c", "#fdba74", "#fed7aa"]
const CHANNEL_COLORS = ["#0f172a", "#1e3a5f", "#1e40af", "#2563eb", "#3b82f6", "#93c5fd"]

const normalize = (value?: string) => (value || "").toLowerCase().trim()

const titleize = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match: string) => match.toUpperCase())

const isPaid = (order: DashboardOrder) => {
  const payment = normalize(order.payment_status)
  return ["authorized", "captured", "paid", "partially_refunded", "refunded"].includes(payment)
}

const isFulfilled = (order: DashboardOrder) => {
  const fulfillment = normalize(order.fulfillment_status)
  const workflow = normalize(order.status)
  return ["fulfilled", "shipped", "delivered"].includes(fulfillment) || workflow === "completed"
}

const isPending = (order: DashboardOrder) => {
  const workflow = normalize(order.status)
  const payment = normalize(order.payment_status)
  const fulfillment = normalize(order.fulfillment_status)

  if (workflow === "draft") return true
  if (workflow === "completed" || workflow === "canceled") return false
  if (["awaiting", "pending", "requires_action", "not_paid"].includes(payment)) return true
  if (["not_fulfilled", "partially_fulfilled", "requires_action"].includes(fulfillment)) return true

  return false
}

const formatCurrency = (amount: number, currencyCode: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

const translateStatus = (value: string, isSpanish: boolean) => {
  const normalized = normalize(value)

  const labels: Record<string, string> = isSpanish
    ? {
        authorized: "Autorizado",
        awaiting: "Esperando pago",
        canceled: "Cancelado",
        captured: "Cobrado",
        delivered: "Entregado",
        draft: "Borrador",
        fulfilled: "Completado",
        not_fulfilled: "Sin preparar",
        not_paid: "No pagado",
        paid: "Pagado",
        partially_fulfilled: "Parcialmente preparado",
        partially_refunded: "Parcialmente reembolsado",
        pending: "Pendiente",
        refunded: "Reembolsado",
        requires_action: "Requiere acción",
        shipped: "Despachado",
      }
    : {
        authorized: "Authorized",
        awaiting: "Awaiting Payment",
        canceled: "Canceled",
        captured: "Captured",
        delivered: "Delivered",
        draft: "Draft",
        fulfilled: "Fulfilled",
        not_fulfilled: "Not Fulfilled",
        not_paid: "Not Paid",
        paid: "Paid",
        partially_fulfilled: "Partially Fulfilled",
        partially_refunded: "Partially Refunded",
        pending: "Pending",
        refunded: "Refunded",
        requires_action: "Requires Action",
        shipped: "Shipped",
      }

  return labels[normalized] || titleize(normalized || "unknown")
}

const resolveDisplayedOrderState = (order: DashboardOrder, isSpanish: boolean) => {
  const workflow = normalize(order.status)
  const payment = normalize(order.payment_status)
  const fulfillment = normalize(order.fulfillment_status)

  if (isFulfilled(order)) return isSpanish ? "Completado" : "Fulfilled"
  if (workflow === "canceled" || payment === "canceled") return isSpanish ? "Cancelado" : "Canceled"
  if (isPending(order)) return isSpanish ? "Pendiente" : "Pending"

  return translateStatus(fulfillment || payment || workflow || "unknown", isSpanish)
}

/** Large-format KPI card for hero metrics */
const HeroCard = ({
  label,
  value,
  hint,
  accent,
}: {
  hint: string
  label: string
  value: string
  accent?: string
}) => (
  <div className="rounded-md border border-ui-border-base bg-ui-bg-base px-5 py-4">
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
    <p
      className="mt-2 font-semibold leading-none"
      style={{ fontSize: "1.625rem", ...(accent ? { color: accent } : {}) }}
    >
      {value}
    </p>
    <Text size="small" leading="compact" className="mt-1.5 text-ui-fg-subtle">
      {hint}
    </Text>
  </div>
)

/** Standard small KPI card */
const MetricCard = ({
  label,
  value,
  hint,
  accent,
}: {
  hint: string
  label: string
  value: string
  accent?: string
}) => (
  <div className="rounded-md border border-ui-border-base bg-ui-bg-base px-4 py-3">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    <Text className="mt-1" weight="plus" style={accent ? { color: accent } : undefined}>
      {value}
    </Text>
    <Text size="small" leading="compact" className="mt-1 text-ui-fg-subtle">
      {hint}
    </Text>
  </div>
)

/** Thin section divider with label */
const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 border-t border-ui-border-base px-6 py-3">
    <Text
      size="small"
      leading="compact"
      className="whitespace-nowrap text-ui-fg-muted"
      style={{ fontSize: "0.68rem", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}
    >
      {label}
    </Text>
    <div className="h-px flex-1 bg-ui-border-base" />
  </div>
)

const buildRevenueTrend = (orders: DashboardOrder[], locale: string): RevenuePoint[] => {
  const now = new Date()
  const monthSlots: { key: string; label: string }[] = []

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthSlots.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString(locale, { month: "short" }),
    })
  }

  const monthTotals = new Map<string, number>(monthSlots.map((slot) => [slot.key, 0]))

  orders.forEach((order) => {
    if (!order.created_at) return
    const createdAt = new Date(order.created_at)
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`
    if (!monthTotals.has(key)) return
    monthTotals.set(key, (monthTotals.get(key) || 0) + (Number(order.total) || 0))
  })

  return monthSlots.map((slot) => ({
    amount: monthTotals.get(slot.key) || 0,
    month: slot.label,
  }))
}

const buildWeeklyOrderTrend = (orders: DashboardOrder[], locale: string): WeeklyPoint[] => {
  const now = new Date()
  const weekSlots: { start: Date; key: string; label: string }[] = []

  for (let i = 12; i >= 0; i--) {
    const pivot = new Date(now)
    pivot.setDate(now.getDate() - i * 7)
    const weekStart = new Date(pivot)
    weekStart.setDate(pivot.getDate() - pivot.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const key = weekStart.toISOString().slice(0, 10)
    const label = weekStart.toLocaleDateString(locale, { month: "short", day: "numeric" })
    weekSlots.push({ start: weekStart, key, label })
  }

  const weekCounts = new Map<string, number>(weekSlots.map((slot) => [slot.key, 0]))

  orders.forEach((order) => {
    if (!order.created_at) return
    const date = new Date(order.created_at)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const key = weekStart.toISOString().slice(0, 10)
    if (weekCounts.has(key)) {
      weekCounts.set(key, (weekCounts.get(key) || 0) + 1)
    }
  })

  return weekSlots.map((slot) => ({
    week: slot.label,
    value: weekCounts.get(slot.key) || 0,
  }))
}

const buildDailyOrderTrend = (orders: DashboardOrder[], locale: string): DailyPoint[] => {
  const now = new Date()
  const daySlots: { key: string; label: string }[] = []

  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    const key = date.toISOString().slice(0, 10)
    const label = date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
    daySlots.push({ key, label })
  }

  const dayCounts = new Map<string, number>(daySlots.map((slot) => [slot.key, 0]))

  orders.forEach((order) => {
    if (!order.created_at) return
    const key = new Date(order.created_at).toISOString().slice(0, 10)
    if (!dayCounts.has(key)) return
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1)
  })

  return daySlots.map((slot) => ({
    day: slot.label,
    value: dayCounts.get(slot.key) || 0,
  }))
}

const buildTopStatusBreakdown = (
  orders: DashboardOrder[],
  selector: (order: DashboardOrder) => string | undefined,
  isSpanish: boolean
): StatusPoint[] => {
  const total = orders.length
  if (!total) return []

  const counts = new Map<string, number>()
  orders.forEach((order) => {
    const value = normalize(selector(order) || "unknown")
    counts.set(value, (counts.get(value) || 0) + 1)
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([raw, count]) => ({
      label: translateStatus(raw, isSpanish),
      percent: Math.round((count / total) * 100),
      total: count,
    }))
}

const buildTopCustomers = (orders: DashboardOrder[]): TopCustomerPoint[] => {
  const revenueByCustomer = new Map<string, number>()

  orders.forEach((order) => {
    const email = (order.email || "No email").trim() || "No email"
    revenueByCustomer.set(email, (revenueByCustomer.get(email) || 0) + (Number(order.total) || 0))
  })

  return [...revenueByCustomer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([email, revenue]) => ({ email, revenue }))
}

const buildChannelBreakdown = (
  orders: DashboardOrder[],
  channelMap: Map<string, string>
): SalesChannelPoint[] => {
  const data = new Map<string, { name: string; orders: number; revenue: number }>()

  orders.forEach((order) => {
    const cid = order.sales_channel_id || "direct"
    const name = channelMap.get(cid) || (order.sales_channel_id ? `Canal ${cid.slice(-4)}` : "Directo")
    const existing = data.get(cid) || { name, orders: 0, revenue: 0 }
    data.set(cid, {
      name,
      orders: existing.orders + 1,
      revenue: existing.revenue + (Number(order.total) || 0),
    })
  })

  return [...data.entries()]
    .map(([channelId, info]) => ({ channelId, ...info }))
    .sort((a, b) => b.revenue - a.revenue)
}

const buildMomRevenue = (
  orders: DashboardOrder[]
): { thisMonth: number; lastMonth: number; growth: number } => {
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`

  let thisMonth = 0
  let lastMonth = 0

  orders.forEach((order) => {
    if (!order.created_at) return
    const date = new Date(order.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    if (key === thisMonthKey) thisMonth += Number(order.total) || 0
    if (key === lastMonthKey) lastMonth += Number(order.total) || 0
  })

  const growth = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0

  return { thisMonth, lastMonth, growth }
}

const AureliaDashboardPage = () => {
  const { i18n } = useTranslation()
  const isSpanish = i18n.language.toLowerCase().startsWith("es")
  const locale = isSpanish ? "es-AR" : "en-US"

  const copy = isSpanish
    ? {
        avgOrderValue: "Ticket promedio",
        channelBreakdown: "Canales de venta",
        channelBreakdownHint: "Revenue y pedidos por canal",
        channelOrders: "pedidos",
        customers: "Clientes",
        customersHint: "Clientes registrados",
        dailyOrders: "Pedidos por día — 14 días",
        dashboardDescription: "Métricas de impacto comercial para operación, pagos y cumplimiento.",
        dashboardTitle: "Aurelia Backoffice Dashboard",
        failedLoad: "No se pudieron cargar las métricas del dashboard:",
        fulfillmentMix: "Estado de cumplimiento",
        fulfillmentRate: "Tasa de cumplimiento",
        fulfillmentRateHint: "Pedidos completados en muestra",
        lastMonth: "Mes anterior",
        lastMonthHint: "Revenue del mes pasado",
        latestOrders: "Últimos pedidos",
        momGrowth: "Crecimiento MoM",
        momGrowthHint: "Variación mes a mes",
        noChannels: "Sin datos de canales.",
        noOrders: "Todavía no hay pedidos.",
        orders: "Pedidos",
        ordersHint: "Pedidos totales en la tienda",
        paidOrders: "Pedidos cobrados",
        paidOrdersHint: "Pedidos con pago capturado/autorizado",
        paymentMix: "Estado de pagos",
        paymentRate: "Cobro efectivo",
        paymentRateHint: "Cobros efectivos en muestra",
        pendingOrders: "Pedidos pendientes",
        pendingOrdersHint: `En base a los últimos ${ORDER_SAMPLE_SIZE} pedidos`,
        products: "Productos",
        productsHint: "Productos en catálogo",
        recentRevenue: "Revenue total",
        recentRevenueHint: `Suma de últimos ${ORDER_SAMPLE_SIZE} pedidos`,
        revenueTrend: "Tendencia de revenue",
        revenueTrendHint: "Últimos 6 meses",
        sampleOrders: "pedidos en muestra",
        sectionCustomers: "Clientes y pedidos",
        sectionFulfillment: "Cumplimiento y canales",
        sectionKpis: "Métricas secundarias",
        sectionRevenue: "Revenue y pagos",
        sectionVolume: "Volumen de pedidos",
        thisMonth: "Este mes",
        thisMonthHint: "Revenue del mes en curso",
        topCustomers: "Top clientes por revenue",
        topCustomersHint: "Concentración de facturación en muestra",
        unknown: "Desconocido",
        avgLeadTime: "Lead time despacho",
        avgLeadTimeHint: "Tiempo promedio desde picking hasta despacho (últimos 30 días)",
        stuckInPicking: "Órdenes atascadas en picking",
        stuckInPickingHint: "Órdenes en estado picking hace más de 24h",
        weeklyOrders: "Pedidos por semana — 13 semanas",
        weeklyOrdersHint: "Pedidos por semana",
      }
    : {
        avgOrderValue: "Average Order Value",
        channelBreakdown: "Sales Channels",
        channelBreakdownHint: "Revenue and orders per channel",
        channelOrders: "orders",
        customers: "Customers",
        customersHint: "Registered customers",
        dailyOrders: "Orders per day — 14 days",
        dashboardDescription: "High-impact metrics for operations, payments, and fulfillment.",
        dashboardTitle: "Aurelia Backoffice Dashboard",
        failedLoad: "Failed to load dashboard metrics:",
        fulfillmentMix: "Fulfillment Status",
        fulfillmentRate: "Fulfillment Rate",
        fulfillmentRateHint: "Fulfilled orders in sample",
        lastMonth: "Last Month",
        lastMonthHint: "Previous month revenue",
        latestOrders: "Latest Orders",
        momGrowth: "MoM Growth",
        momGrowthHint: "Month-over-month change",
        noChannels: "No channel data.",
        noOrders: "No orders yet.",
        orders: "Orders",
        ordersHint: "Total orders in your store",
        paidOrders: "Paid Orders",
        paidOrdersHint: "Orders with captured/authorized payment",
        paymentMix: "Payment Status",
        paymentRate: "Payment Success Rate",
        paymentRateHint: "Successful payments in sample",
        pendingOrders: "Pending Orders",
        pendingOrdersHint: `Based on latest ${ORDER_SAMPLE_SIZE} orders`,
        products: "Products",
        productsHint: "Products in catalog",
        recentRevenue: "Total Revenue",
        recentRevenueHint: `Sum of latest ${ORDER_SAMPLE_SIZE} orders`,
        revenueTrend: "Revenue Trend",
        revenueTrendHint: "Last 6 months",
        sampleOrders: "orders in sample",
        sectionCustomers: "Customers & Orders",
        sectionFulfillment: "Fulfillment & Channels",
        sectionKpis: "Secondary Metrics",
        sectionRevenue: "Revenue & Payments",
        sectionVolume: "Order Volume",
        thisMonth: "This Month",
        thisMonthHint: "Current month revenue",
        topCustomers: "Top Customers by Revenue",
        topCustomersHint: "Revenue concentration in sample",
        unknown: "Unknown",
        avgLeadTime: "Dispatch Lead Time",
        avgLeadTimeHint: "Avg time from picking to dispatch (last 30 days)",
        stuckInPicking: "Orders Stuck in Picking",
        stuckInPickingHint: "Orders in picking status for >24h",
        weeklyOrders: "Orders per week — 13 weeks",
        weeklyOrdersHint: "Orders per week",
      }

  const { data, error, isError, isLoading } = useQuery<DashboardData>({
    queryKey: ["aurelia-backoffice-metrics-v4", locale],
    queryFn: async () => {
      const [ordersResult, productsResult, customersResult, ordersSampleResult, channelsResult, fulfillmentKpis] =
        await Promise.all([
          sdk.admin.order.list({ limit: 1 }),
          sdk.admin.product.list({ limit: 1 }),
          sdk.admin.customer.list({ limit: 1 }),
          sdk.admin.order.list({
            fields:
              "id,display_id,email,total,currency_code,created_at,status,fulfillment_status,payment_status,sales_channel_id,metadata",
            limit: ORDER_SAMPLE_SIZE,
            order: "-created_at",
          }),
          sdk.admin.salesChannel.list({ limit: 50 }),
          sdk.client.fetch("/admin/fulfillment/kpis").catch(() => ({
            avg_lead_time_minutes: null,
            stuck_in_picking_count: 0,
          })),
        ])

      const sampleOrders = (ordersSampleResult.orders ?? []) as DashboardOrder[]
      const sampleSize = sampleOrders.length
      const revenue = sampleOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
      const avgOrderValue = sampleSize ? revenue / sampleSize : 0
      const pendingOrders = sampleOrders.filter(isPending).length
      const fulfilledCount = sampleOrders.filter(isFulfilled).length
      const paidCount = sampleOrders.filter(isPaid).length
      const fulfillmentRate = sampleSize ? Math.round((fulfilledCount / sampleSize) * 100) : 0
      const paymentRate = sampleSize ? Math.round((paidCount / sampleSize) * 100) : 0

      const currencyCode =
        sampleOrders.find((order) => order.currency_code)?.currency_code?.toUpperCase() || "ARS"

      const revenueTrend = buildRevenueTrend(sampleOrders, locale)
      const maxRevenuePoint = Math.max(...revenueTrend.map((point) => point.amount), 1)
      const revenuePoints = revenueTrend
        .map((point, index) => {
          const x = (index / Math.max(revenueTrend.length - 1, 1)) * 100
          const y = 100 - (point.amount / maxRevenuePoint) * 100
          return `${x},${y}`
        })
        .join(" ")

      const workflowMix = buildTopStatusBreakdown(
        sampleOrders,
        (order) => order.fulfillment_status || order.status,
        isSpanish
      )
      const paymentMix = buildTopStatusBreakdown(sampleOrders, (order) => order.payment_status, isSpanish)

      let donutStart = 0
      const donutSegments = workflowMix
        .map((status, index) => {
          const end = donutStart + status.percent
          const color = DONUT_COLORS[index % DONUT_COLORS.length]
          const segment = `${color} ${donutStart}% ${end}%`
          donutStart = end
          return segment
        })
        .join(", ")

      const channelMap = new Map<string, string>()
      ;(channelsResult.sales_channels ?? []).forEach((ch: { id: string; name: string }) => {
        channelMap.set(ch.id, ch.name)
      })

      const channelBreakdown = buildChannelBreakdown(sampleOrders, channelMap)

      const { thisMonth, lastMonth, growth: momGrowth } = buildMomRevenue(sampleOrders)

      return {
        avgOrderValue,
        channelBreakdown,
        currencyCode,
        customersCount: customersResult.count ?? 0,
        dailyOrderTrend: buildDailyOrderTrend(sampleOrders, locale),
        donutSegments,
        fulfilledCount,
        fulfillmentRate,
        lastMonthRevenue: lastMonth,
        latestOrders: sampleOrders.slice(0, 10),
        momGrowth,
        ordersCount: ordersResult.count ?? 0,
        paidCount,
        paymentMix,
        paymentRate,
        pendingOrders,
        productsCount: productsResult.count ?? 0,
        revenue,
        revenuePoints,
        revenueTrend,
        sampleSize,
        thisMonthRevenue: thisMonth,
        topCustomers: buildTopCustomers(sampleOrders),
        weeklyOrderTrend: buildWeeklyOrderTrend(sampleOrders, locale),
        workflowMix,
        avgLeadTimeMinutes: (fulfillmentKpis as { avg_lead_time_minutes?: number | null })?.avg_lead_time_minutes ?? null,
        stuckInPickingCount: (fulfillmentKpis as { stuck_in_picking_count?: number })?.stuck_in_picking_count ?? 0,
      }
    },
  })

  return (
    <Container className="p-0">
      {/* ── Header ── */}
      <div className="border-b border-ui-border-base px-6 py-4">
        <Heading level="h1">{copy.dashboardTitle}</Heading>
        <Text size="small" leading="compact" className="mt-1 text-ui-fg-subtle">
          {copy.dashboardDescription}
        </Text>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center px-6 py-10">
          <Spinner />
        </div>
      ) : null}

      {isError ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {copy.failedLoad} {(error as Error)?.message || copy.unknown}
          </Text>
        </div>
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="flex flex-col">

          {/* ── Hero KPIs: the 4 most actionable numbers ── */}
          <div className="grid grid-cols-2 gap-3 px-6 py-4 xl:grid-cols-4">
            <HeroCard
              label={copy.recentRevenue}
              value={formatCurrency(data.revenue, data.currencyCode, locale)}
              hint={copy.recentRevenueHint}
            />
            <HeroCard
              label={copy.momGrowth}
              value={`${data.momGrowth >= 0 ? "+" : ""}${data.momGrowth}%`}
              hint={copy.momGrowthHint}
              accent={data.momGrowth >= 0 ? "#16a34a" : "#dc2626"}
            />
            <HeroCard
              label={copy.pendingOrders}
              value={data.pendingOrders.toLocaleString(locale)}
              hint={copy.pendingOrdersHint}
              accent={data.pendingOrders > 0 ? "#c2410c" : undefined}
            />
            <HeroCard
              label={copy.fulfillmentRate}
              value={`${data.fulfillmentRate}%`}
              hint={copy.fulfillmentRateHint}
              accent={data.fulfillmentRate >= 80 ? "#16a34a" : data.fulfillmentRate >= 50 ? "#ca8a04" : "#dc2626"}
            />
          </div>

          {/* ── Secondary Metrics ── */}
          <SectionDivider label={copy.sectionKpis} />
          <div className="grid grid-cols-2 gap-3 px-6 pb-4 md:grid-cols-4">
            <MetricCard
              label={copy.orders}
              value={data.ordersCount.toLocaleString(locale)}
              hint={copy.ordersHint}
            />
            <MetricCard
              label={copy.products}
              value={data.productsCount.toLocaleString(locale)}
              hint={copy.productsHint}
            />
            <MetricCard
              label={copy.customers}
              value={data.customersCount.toLocaleString(locale)}
              hint={copy.customersHint}
            />
            <MetricCard
              label={copy.avgOrderValue}
              value={formatCurrency(data.avgOrderValue, data.currencyCode, locale)}
              hint={`${data.sampleSize.toLocaleString(locale)} ${copy.sampleOrders}`}
            />
            <MetricCard
              label={copy.thisMonth}
              value={formatCurrency(data.thisMonthRevenue, data.currencyCode, locale)}
              hint={copy.thisMonthHint}
            />
            <MetricCard
              label={copy.lastMonth}
              value={formatCurrency(data.lastMonthRevenue, data.currencyCode, locale)}
              hint={copy.lastMonthHint}
            />
            <MetricCard
              label={copy.paymentRate}
              value={`${data.paymentRate}%`}
              hint={copy.paymentRateHint}
            />
            <MetricCard
              label={copy.paidOrders}
              value={data.paidCount.toLocaleString(locale)}
              hint={copy.paidOrdersHint}
            />
          </div>

          {/* ── Fulfillment KPIs ── */}
          <SectionDivider label={copy.sectionFulfillment} />
          <div className="grid grid-cols-2 gap-3 px-6 pb-4">
            <MetricCard
              label={copy.avgLeadTime}
              value={
                data.avgLeadTimeMinutes === null
                  ? "—"
                  : data.avgLeadTimeMinutes < 60
                  ? `${data.avgLeadTimeMinutes}min`
                  : `${Math.round(data.avgLeadTimeMinutes / 60)}h`
              }
              hint={copy.avgLeadTimeHint}
              accent={
                data.avgLeadTimeMinutes === null
                  ? undefined
                  : data.avgLeadTimeMinutes <= 60
                  ? "#16a34a"
                  : data.avgLeadTimeMinutes <= 240
                  ? "#ca8a04"
                  : "#dc2626"
              }
            />
            <MetricCard
              label={copy.stuckInPicking}
              value={data.stuckInPickingCount.toLocaleString(locale)}
              hint={copy.stuckInPickingHint}
              accent={data.stuckInPickingCount > 0 ? "#dc2626" : undefined}
            />
          </div>

          {/* ── Revenue & Payments ── */}
          <SectionDivider label={copy.sectionRevenue} />
          <div className="grid grid-cols-1 gap-6 px-6 pb-4 xl:grid-cols-[1.8fr_1.1fr]">
            {/* Revenue area chart — monthly amounts are continuous accumulation, area chart is correct */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <div className="flex items-center justify-between">
                <Text size="small" leading="compact" weight="plus">
                  {copy.revenueTrend}
                </Text>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {copy.revenueTrendHint}
                </Text>
              </div>
              <div className="mt-3">
                <div className="relative h-52 w-full">
                  <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="aureliaRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      fill="url(#aureliaRevenueGradient)"
                      points={`0,100 ${data.revenuePoints} 100,100`}
                    />
                    <polyline
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      points={data.revenuePoints}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-end justify-between px-1">
                    {data.revenueTrend.map((point) => (
                      <Text
                        key={point.month}
                        size="small"
                        leading="compact"
                        className="text-ui-fg-subtle"
                      >
                        {point.month}
                      </Text>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment status mix — horizontal bars are correct for part-to-whole */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.paymentMix}
              </Text>
              {data.paymentMix.length ? (
                <div className="mt-4 space-y-4">
                  {data.paymentMix.map((status, index) => (
                    <div key={status.label}>
                      <div className="flex items-center justify-between">
                        <Text size="small" leading="compact" weight="plus">
                          {status.label}
                        </Text>
                        <div className="flex items-center gap-2">
                          <Text size="small" leading="compact" className="text-ui-fg-subtle">
                            {status.total.toLocaleString(locale)}
                          </Text>
                          <Text size="small" leading="compact" weight="plus">
                            {status.percent}%
                          </Text>
                        </div>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-ui-bg-subtle">
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length],
                            width: `${status.percent}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text size="small" leading="compact" className="mt-3 text-ui-fg-subtle">
                  {copy.noOrders}
                </Text>
              )}
            </div>
          </div>

          {/* ── Order Volume ── */}
          {/* Bar charts: discrete counts per period are better as bars than area/line */}
          <SectionDivider label={copy.sectionVolume} />
          <div className="grid grid-cols-1 gap-6 px-6 pb-4 xl:grid-cols-2">
            {/* Weekly orders — bar chart */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.weeklyOrders}
              </Text>
              <div className="mt-3">
                <div className="relative h-44 w-full">
                  {(() => {
                    const maxVal = Math.max(...data.weeklyOrderTrend.map((p) => p.value), 1)
                    const n = data.weeklyOrderTrend.length
                    const gap = 100 / n
                    const barW = gap * 0.65
                    const barOffset = gap * 0.175
                    return (
                      <svg
                        className="h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {data.weeklyOrderTrend.map((point, i) => {
                          const barH = (point.value / maxVal) * 88
                          return (
                            <rect
                              key={i}
                              x={i * gap + barOffset}
                              y={100 - barH}
                              width={barW}
                              height={barH}
                              fill="#0f172a"
                              opacity={0.75}
                              rx={0.5}
                            />
                          )
                        })}
                      </svg>
                    )
                  })()}
                  {/* X-axis labels — show every 3rd week to avoid crowding */}
                  <div className="absolute inset-0 flex items-end justify-between px-1">
                    {data.weeklyOrderTrend.map((point, index) =>
                      index % 3 === 0 ? (
                        <Text
                          key={`${point.week}-${index}`}
                          size="small"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {point.week}
                        </Text>
                      ) : (
                        <span key={`${point.week}-${index}`} />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily orders — bar chart */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.dailyOrders}
              </Text>
              <div className="mt-3">
                <div className="relative h-44 w-full">
                  {(() => {
                    const maxVal = Math.max(...data.dailyOrderTrend.map((p) => p.value), 1)
                    const n = data.dailyOrderTrend.length
                    const gap = 100 / n
                    const barW = gap * 0.65
                    const barOffset = gap * 0.175
                    return (
                      <svg
                        className="h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {data.dailyOrderTrend.map((point, i) => {
                          const barH = (point.value / maxVal) * 88
                          return (
                            <rect
                              key={i}
                              x={i * gap + barOffset}
                              y={100 - barH}
                              width={barW}
                              height={barH}
                              fill="#1e40af"
                              opacity={0.75}
                              rx={0.5}
                            />
                          )
                        })}
                      </svg>
                    )
                  })()}
                  {/* X-axis labels — show every 2nd day */}
                  <div className="absolute inset-0 flex items-end justify-between px-1">
                    {data.dailyOrderTrend.map((point, index) =>
                      index % 2 === 0 ? (
                        <Text
                          key={point.day}
                          size="small"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {point.day}
                        </Text>
                      ) : (
                        <span key={point.day} />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fulfillment & Channels ── */}
          <SectionDivider label={copy.sectionFulfillment} />
          <div className="grid grid-cols-1 gap-6 px-6 pb-4 xl:grid-cols-[1.1fr_1.8fr]">
            {/* Fulfillment donut */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.fulfillmentMix}
              </Text>
              <Text size="small" leading="compact" className="mt-1 text-ui-fg-subtle">
                {data.sampleSize.toLocaleString(locale)} {copy.sampleOrders}
              </Text>

              {data.workflowMix.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div className="flex items-center justify-center">
                    <div
                      className="relative h-40 w-40 rounded-full"
                      style={{ background: `conic-gradient(${data.donutSegments})` }}
                    >
                      <div className="absolute inset-[18%] rounded-full bg-ui-bg-base text-center">
                        <Text className="pt-8" weight="plus">
                          {data.workflowMix
                            .reduce((sum, status) => sum + status.total, 0)
                            .toLocaleString(locale)}
                        </Text>
                        <Text size="small" leading="compact" className="text-ui-fg-subtle">
                          {copy.orders.toLowerCase()}
                        </Text>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {data.workflowMix.map((status, index) => (
                      <div key={status.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                          />
                          <Text size="small" leading="compact" weight="plus">
                            {status.label}
                          </Text>
                        </div>
                        <div className="text-right">
                          <Text size="small" leading="compact">
                            {status.percent}%
                          </Text>
                          <Text size="small" leading="compact" className="text-ui-fg-subtle">
                            {status.total.toLocaleString(locale)}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Text size="small" leading="compact" className="mt-3 text-ui-fg-subtle">
                  {copy.noOrders}
                </Text>
              )}
            </div>

            {/* Sales channels horizontal bars */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.channelBreakdown}
              </Text>
              <Text size="small" leading="compact" className="mt-1 text-ui-fg-subtle">
                {copy.channelBreakdownHint}
              </Text>
              {data.channelBreakdown.length ? (
                <div className="mt-4 space-y-4">
                  {(() => {
                    const peak = Math.max(...data.channelBreakdown.map((ch) => ch.revenue), 1)
                    return data.channelBreakdown.map((ch, index) => (
                      <div key={ch.channelId}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
                              }}
                            />
                            <Text size="small" leading="compact" weight="plus">
                              {ch.name}
                            </Text>
                          </div>
                          <div className="text-right">
                            <Text size="small" leading="compact">
                              {formatCurrency(ch.revenue, data.currencyCode, locale)}
                            </Text>
                            <Text size="small" leading="compact" className="text-ui-fg-subtle">
                              {ch.orders.toLocaleString(locale)} {copy.channelOrders}
                            </Text>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-ui-bg-subtle">
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
                              width: `${Math.max(Math.round((ch.revenue / peak) * 100), 4)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <Text size="small" leading="compact" className="mt-3 text-ui-fg-subtle">
                  {copy.noChannels}
                </Text>
              )}
            </div>
          </div>

          {/* ── Customers & Orders ── */}
          <SectionDivider label={copy.sectionCustomers} />
          <div className="grid grid-cols-1 gap-6 px-6 pb-6 xl:grid-cols-2">
            {/* Top customers horizontal bars */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.topCustomers}
              </Text>
              <Text size="small" leading="compact" className="mt-1 text-ui-fg-subtle">
                {copy.topCustomersHint}
              </Text>
              {data.topCustomers.length ? (
                <div className="mt-4 space-y-3">
                  {(() => {
                    const peak = Math.max(...data.topCustomers.map((entry) => entry.revenue), 1)
                    return data.topCustomers.map((entry, index) => {
                      const width = Math.round((entry.revenue / peak) * 100)
                      // Show rank number + truncated email for readability
                      const emailDisplay =
                        entry.email.length > 28
                          ? `${entry.email.slice(0, 14)}…${entry.email.slice(entry.email.lastIndexOf("@"))}`
                          : entry.email
                      return (
                        <div key={entry.email} className="rounded-md border border-ui-border-base p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ui-fg-on-inverted"
                                style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length], fontSize: "0.65rem", fontWeight: 700 }}
                              >
                                {index + 1}
                              </span>
                              <Text
                                size="small"
                                leading="compact"
                                weight="plus"
                                className="truncate"
                              >
                                {emailDisplay}
                              </Text>
                            </div>
                            <Text size="small" leading="compact" className="ml-2 shrink-0 text-ui-fg-subtle">
                              {formatCurrency(entry.revenue, data.currencyCode, locale)}
                            </Text>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-ui-bg-subtle">
                            <div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
                                width: `${Math.max(width, 4)}%`,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              ) : (
                <Text size="small" leading="compact" className="mt-3 text-ui-fg-subtle">
                  {copy.noOrders}
                </Text>
              )}
            </div>

            {/* Latest orders list */}
            <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-4">
              <Text size="small" leading="compact" weight="plus">
                {copy.latestOrders}
              </Text>
              {data.latestOrders.length ? (
                <div className="mt-3 flex flex-col gap-2">
                  {data.latestOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-md border border-ui-border-base bg-ui-bg-base px-4 py-3"
                    >
                      <div className="flex flex-col min-w-0">
                        <Text size="small" leading="compact" weight="plus">
                          #{order.display_id ?? order.id.slice(0, 8)}
                        </Text>
                        <Text size="small" leading="compact" className="truncate text-ui-fg-subtle">
                          {order.email ?? copy.unknown}
                        </Text>
                        <Text size="small" leading="compact" className="text-ui-fg-subtle">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString(locale)
                            : copy.unknown}
                        </Text>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <Text size="small" leading="compact" weight="plus">
                          {formatCurrency(
                            Number(order.total) || 0,
                            order.currency_code?.toUpperCase() || data.currencyCode,
                            locale
                          )}
                        </Text>
                        <Text size="small" leading="compact" className="text-ui-fg-subtle">
                          {resolveDisplayedOrderState(order, isSpanish)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Text size="small" leading="compact" className="mt-2 text-ui-fg-subtle">
                  {copy.noOrders}
                </Text>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Aurelia Dashboard",
  rank: 1,
})

export default AureliaDashboardPage
