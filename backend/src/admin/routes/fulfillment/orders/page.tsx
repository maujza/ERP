"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath } from "@medusajs/icons"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Button,
  Container,
  DataTable,
  DataTablePaginationState,
  Drawer,
  Heading,
  Input,
  Label,
  Prompt,
  Text,
  createDataTableColumnHelper,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { sdk } from "../../../lib/client"

// ─── Types ────────────────────────────────────────────────────────────────────

type PickListItem = {
  variant_id: string
  title: string
  sku: string | null
  quantity: number
  image_url: string | null
}

// FulfillmentRecord from /admin/fulfillment/orders
type FulfillmentRecord = {
  id: string
  order_id: string
  status: "pending" | "picking" | "packed" | "dispatched" | "cancelled"
  pick_list: PickListItem[] | null
  packed_weight: number | null
  packed_dimensions: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
  last_notified_at: string | null
}

// Medusa order summary
type MedusaOrder = {
  id: string
  display_id: number
  email: string | null
  status: string
  payment_status: string // computed by Medusa, always returned
  created_at: string
}

// Merged row for display
type FulfillmentRow = {
  order_id: string
  display_id: number | null
  email: string | null
  fulfillment_status: "ready" | "picking" | "packed" | "dispatched" | "cancelled"
  record: FulfillmentRecord | null
  pick_list: PickListItem[]
  tracking_number: string | null
  updated_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "grey" | "blue" | "green" | "red" | "orange"> = {
  ready: "grey",
  picking: "blue",
  packed: "orange",
  dispatched: "green",
  cancelled: "red",
}

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready to Pick",
  picking: "Picking",
  packed: "Packed",
  dispatched: "Dispatched",
  cancelled: "Cancelled",
}

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createDataTableColumnHelper<FulfillmentRow>()

// ─── Page ─────────────────────────────────────────────────────────────────────

const FulfillmentOrdersPage = () => {
  const queryClient = useQueryClient()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // Pack drawer state
  const [packOrder, setPackOrder] = useState<FulfillmentRow | null>(null)
  const [packWeight, setPackWeight] = useState("")
  const [packDimensions, setPackDimensions] = useState("")

  // Dispatch drawer state
  const [dispatchOrder, setDispatchOrder] = useState<FulfillmentRow | null>(null)
  const [trackingNumber, setTrackingNumber] = useState("")

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: fulfillmentsData, isLoading: fulfillmentsLoading } = useQuery({
    queryKey: ["fulfillment-records"],
    queryFn: () =>
      sdk.client.fetch<{ fulfillments: FulfillmentRecord[]; count: number }>(
        "/admin/fulfillment/orders",
        { query: { limit: 200 } }
      ),
  })

  // Fetch orders that are paid and not yet fulfilled, to show "Ready" rows
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["aurelia-orders-fulfillable"],
    queryFn: () =>
      sdk.client.fetch<{ orders: MedusaOrder[]; count: number }>("/admin/orders", {
        query: {
          // Medusa v2: payment_status can't be used as a filter (computed field).
          // Fetch pending/requires_action orders and filter client-side by payment_status.
          "status[]": ["pending", "requires_action"],
          limit: 200,
          fields: "id,display_id,email,status,created_at",
          // payment_status is always returned by Medusa regardless of fields list
        },
      }),
  })

  // ── Merge: combine Medusa orders + FulfillmentRecords ────────────────────
  //
  //  Medusa order (paid, not fully fulfilled)
  //       │
  //       ├── no FulfillmentRecord → status: "ready"
  //       └── has FulfillmentRecord → use record status

  const rows: FulfillmentRow[] = (() => {
    const records = fulfillmentsData?.fulfillments ?? []
    const medusaOrders = ordersData?.orders ?? []

    const recordByOrderId = new Map(records.map((r) => [r.order_id, r]))

    // Start with rows that have a FulfillmentRecord
    const rowsFromRecords: FulfillmentRow[] = records.map((record) => {
      const medusaOrder = medusaOrders.find((o) => o.id === record.order_id)
      // FulfillmentRecord.status "pending" means the workflow hasn't fully started —
      // treat it the same as "ready" in the UI so the operator sees a "Start Picking" button.
      const uiStatus: FulfillmentRow["fulfillment_status"] =
        record.status === "pending" ? "ready" : record.status
      return {
        order_id: record.order_id,
        display_id: medusaOrder?.display_id ?? null,
        email: medusaOrder?.email ?? null,
        fulfillment_status: uiStatus,
        record,
        pick_list: record.pick_list ?? [],
        tracking_number: record.tracking_number,
        updated_at: record.updated_at,
      }
    })

    // Add "ready" rows for PAID Medusa orders that don't have a FulfillmentRecord yet.
    // Only show orders where payment was captured or authorized — skip unpaid/pending-payment.
    const PAID_STATUSES = ["captured", "authorized", "partially_captured"]
    const readyRows: FulfillmentRow[] = medusaOrders
      .filter((o) => !recordByOrderId.has(o.id) && PAID_STATUSES.includes(o.payment_status))
      .map((o) => ({
        order_id: o.id,
        display_id: o.display_id,
        email: o.email,
        fulfillment_status: "ready" as const,
        record: null,
        pick_list: [],
        tracking_number: null,
        updated_at: o.created_at,
      }))

    return [
      ...rowsFromRecords,
      ...readyRows,
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  })()

  const isLoading = fulfillmentsLoading || ordersLoading

  // ── Mutations ─────────────────────────────────────────────────────────────

  const pickMutation = useMutation({
    mutationFn: (order_id: string) =>
      sdk.client.fetch(`/admin/fulfillment/orders/${order_id}/pick`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fulfillment-records"] })
      toast.success("Pick list generated — order is now in picking")
    },
    onError: () => toast.error("Failed to start picking"),
  })

  const packMutation = useMutation({
    mutationFn: ({
      order_id,
      packed_weight,
      packed_dimensions,
    }: {
      order_id: string
      packed_weight: number
      packed_dimensions?: string
    }) =>
      sdk.client.fetch(`/admin/fulfillment/orders/${order_id}/pack`, {
        method: "POST",
        body: { packed_weight, packed_dimensions: packed_dimensions || undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fulfillment-records"] })
      toast.success("Order packed")
      setPackOrder(null)
      setPackWeight("")
      setPackDimensions("")
    },
    onError: () => toast.error("Failed to confirm pack"),
  })

  const dispatchMutation = useMutation({
    mutationFn: ({
      order_id,
      tracking_number,
    }: {
      order_id: string
      tracking_number: string
    }) =>
      sdk.client.fetch(`/admin/fulfillment/orders/${order_id}/dispatch`, {
        method: "POST",
        body: { tracking_number },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fulfillment-records"] })
      toast.success("Order dispatched")
      setDispatchOrder(null)
      setTrackingNumber("")
    },
    onError: () => toast.error("Failed to dispatch order"),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePack = () => {
    if (!packOrder) return
    const weight = parseFloat(packWeight)
    if (isNaN(weight) || weight <= 0) {
      toast.error("Weight must be a positive number")
      return
    }
    packMutation.mutate({
      order_id: packOrder.order_id,
      packed_weight: weight,
      packed_dimensions: packDimensions || undefined,
    })
  }

  const handleDispatch = () => {
    if (!dispatchOrder) return
    if (!trackingNumber.trim()) {
      toast.error("Tracking number is required")
      return
    }
    dispatchMutation.mutate({
      order_id: dispatchOrder.order_id,
      tracking_number: trackingNumber.trim(),
    })
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  const limit = pagination.pageSize
  const offset = pagination.pageIndex * limit
  const paginatedRows = rows.slice(offset, offset + limit)

  const columns = [
    columnHelper.display({
      id: "order",
      header: "Order",
      cell: ({ row }) => {
        const r = row.original
        return (
          <div>
            <Text className="font-medium">
              {r.display_id ? `#${r.display_id}` : r.order_id.slice(0, 8).toUpperCase()}
            </Text>
            {r.email && (
              <Text size="small" className="text-ui-fg-subtle">
                {r.email}
              </Text>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("fulfillment_status", {
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue()
        return (
          <Badge size="2xsmall" color={STATUS_COLORS[s] || "grey"}>
            {STATUS_LABELS[s] || s}
          </Badge>
        )
      },
    }),
    columnHelper.display({
      id: "items",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.pick_list
        if (items.length === 0) return <Text className="text-ui-fg-subtle">—</Text>
        return (
          <div className="flex flex-col gap-0.5">
            {items.slice(0, 2).map((item, i) => (
              <Text key={i} size="small">
                {item.quantity}× {item.title}
                {item.sku ? ` (${item.sku})` : ""}
              </Text>
            ))}
            {items.length > 2 && (
              <Text size="small" className="text-ui-fg-subtle">
                +{items.length - 2} more
              </Text>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor("tracking_number", {
      header: "Tracking",
      cell: ({ getValue }) => getValue() || "—",
    }),
    columnHelper.accessor("updated_at", {
      header: "Updated",
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex items-center gap-2">
            {r.fulfillment_status === "ready" && (
              <Prompt>
                <Prompt.Trigger asChild>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={pickMutation.isPending}
                  >
                    Start Picking
                  </Button>
                </Prompt.Trigger>
                <Prompt.Content>
                  <Prompt.Header>
                    <Prompt.Title>Start Picking</Prompt.Title>
                    <Prompt.Description>
                      Generate a pick list for order{" "}
                      {r.display_id ? `#${r.display_id}` : r.order_id.slice(0, 8)}?
                    </Prompt.Description>
                  </Prompt.Header>
                  <Prompt.Footer>
                    <Prompt.Cancel>Cancel</Prompt.Cancel>
                    <Prompt.Action onClick={() => pickMutation.mutate(r.order_id)}>
                      Start Picking
                    </Prompt.Action>
                  </Prompt.Footer>
                </Prompt.Content>
              </Prompt>
            )}
            {r.fulfillment_status === "picking" && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => {
                  setPackOrder(r)
                  setPackWeight("")
                  setPackDimensions("")
                }}
              >
                Confirm Pack
              </Button>
            )}
            {r.fulfillment_status === "packed" && (
              <Button
                size="small"
                onClick={() => {
                  setDispatchOrder(r)
                  setTrackingNumber("")
                }}
              >
                Dispatch
              </Button>
            )}
            {r.fulfillment_status === "dispatched" && (
              <Text size="small" className="text-ui-fg-subtle">
                Dispatched ✓
              </Text>
            )}
          </div>
        )
      },
    }),
  ]

  const table = useDataTable({
    data: paginatedRows,
    columns,
    getRowId: (row) => row.order_id,
    rowCount: rows.length,
    isLoading,
    pagination: { state: pagination, onPaginationChange: setPagination },
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Fulfillment</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Pick → Pack → Dispatch workflow for paid orders
          </Text>
        </div>
      </div>

      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      {/* ── Pack drawer ──────────────────────────────────────────────────── */}
      <Drawer open={!!packOrder} onOpenChange={(open) => !open && setPackOrder(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              Confirm Pack —{" "}
              {packOrder?.display_id ? `#${packOrder.display_id}` : packOrder?.order_id.slice(0, 8)}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 p-6">
            {/* Pick list summary */}
            {packOrder && packOrder.pick_list.length > 0 && (
              <div>
                <Text size="small" className="mb-2 font-medium text-ui-fg-subtle">
                  Items to pack
                </Text>
                <div className="flex flex-col gap-1 rounded-md border border-ui-border-base p-3">
                  {packOrder.pick_list.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <Text size="small">
                        {item.quantity}× {item.title}
                        {item.sku ? ` (${item.sku})` : ""}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-y-2">
              <Label htmlFor="pack-weight">Weight (kg) *</Label>
              <Input
                id="pack-weight"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 0.350"
                value={packWeight}
                onChange={(e) => setPackWeight(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="pack-dimensions">Dimensions (optional)</Label>
              <Input
                id="pack-dimensions"
                placeholder="e.g. 20x15x10 cm"
                value={packDimensions}
                onChange={(e) => setPackDimensions(e.target.value)}
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={handlePack}
              isLoading={packMutation.isPending}
            >
              Confirm Pack
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      {/* ── Dispatch drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={!!dispatchOrder}
        onOpenChange={(open) => !open && setDispatchOrder(null)}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              Dispatch Order —{" "}
              {dispatchOrder?.display_id
                ? `#${dispatchOrder.display_id}`
                : dispatchOrder?.order_id.slice(0, 8)}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 p-6">
            {dispatchOrder && (
              <div className="rounded-md border border-ui-border-base p-3">
                <Text size="small" className="text-ui-fg-subtle">Weight</Text>
                <Text>{dispatchOrder.record?.packed_weight ?? "—"} kg</Text>
                {dispatchOrder.record?.packed_dimensions && (
                  <>
                    <Text size="small" className="mt-2 text-ui-fg-subtle">Dimensions</Text>
                    <Text>{dispatchOrder.record.packed_dimensions}</Text>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="tracking-number">Tracking Number *</Label>
              <Input
                id="tracking-number"
                placeholder="e.g. AR123456789"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={handleDispatch}
              isLoading={dispatchMutation.isPending}
            >
              Mark as Dispatched
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Fulfillment",
  icon: ArrowPath,
})

export default FulfillmentOrdersPage
