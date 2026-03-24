"use client"

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Button,
  Container,
  Heading,
  Label,
  Prompt,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import {
  canCancelPurchaseOrder,
  canReceivePurchaseOrder,
  canSubmitPurchaseOrder,
} from "../../../../lib/purchase-order-permissions"
import { type Role } from "../../../../lib/roles"
import { sdk } from "../../../../lib/client"

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderItem = {
  id: string
  variant_id: string
  quantity: number
  unit_cost: number
  received_quantity: number | null
  product_variant?: {
    id: string
    title: string
    sku: string | null
    product?: { id: string; title: string }
  }
}

type PurchaseOrder = {
  id: string
  supplier_id: string
  reference_number: string | null
  status: "draft" | "submitted" | "received" | "cancelled"
  notes: string | null
  expected_delivery_date: string | null
  discrepancy_count: number
  created_at: string
  items: OrderItem[]
}

type Supplier = { id: string; name: string }
type StockLocation = { id: string; name: string }
type CurrentUser = {
  id: string
  metadata?: {
    role?: Role
  } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "grey" | "blue" | "green" | "red"> = {
  draft: "grey",
  submitted: "blue",
  received: "green",
  cancelled: "red",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  received: "Received",
  cancelled: "Cancelled",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PurchaseOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [locationId, setLocationId] = useState("")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["purchase-order-detail", id],
    queryFn: () =>
      sdk.client.fetch<{ order: PurchaseOrder }>(`/admin/purchase/orders/${id}`),
    enabled: !!id,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () =>
      sdk.client.fetch<{ suppliers: Supplier[] }>("/admin/purchase/suppliers", {
        query: { limit: 100 },
      }),
  })

  const { data: currentUserData } = useQuery({
    queryKey: ["current-admin-user"],
    queryFn: () => sdk.client.fetch<{ user: CurrentUser }>("/admin/users/me"),
  })

  const { data: locationsData } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () =>
      sdk.client.fetch<{ stock_locations: StockLocation[] }>(
        "/admin/stock-locations",
        { query: { limit: 100 } }
      ),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/purchase/orders/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order-detail", id] })
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Purchase order submitted")
    },
    onError: (error: any) =>
      toast.error(error?.message || "Failed to submit purchase order"),
  })

  const receiveMutation = useMutation({
    mutationFn: (location_id: string) =>
      sdk.client.fetch(`/admin/purchase/orders/${id}/receive`, {
        method: "POST",
        body: { location_id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order-detail", id] })
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Order received — inventory updated")
      setLocationId("")
    },
    onError: (error: any) =>
      toast.error(error?.message || "Failed to receive purchase order"),
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/purchase/orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success("Purchase order cancelled")
      navigate("/purchase/orders")
    },
    onError: (error: any) =>
      toast.error(error?.message || "Failed to cancel purchase order"),
  })

  if (isLoading) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Loading...</Text>
      </Container>
    )
  }

  if (isError || !data?.order) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Purchase order not found.</Text>
      </Container>
    )
  }

  const order = data.order
  const currentRole = currentUserData?.user?.metadata?.role
  const supplierName =
    suppliersData?.suppliers.find((s) => s.id === order.supplier_id)?.name ||
    order.supplier_id
  const canSubmit = canSubmitPurchaseOrder(currentRole, order.status)
  const canReceive = canReceivePurchaseOrder(currentRole, order.status)
  const canCancel = canCancelPurchaseOrder(currentRole, order.status)

  const totalCost = order.items.reduce(
    (sum, item) => sum + item.unit_cost * item.quantity,
    0
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Container className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Heading level="h1">
              {order.reference_number || `PO ${order.id.slice(0, 8).toUpperCase()}`}
            </Heading>
            <div className="flex items-center gap-2">
              <Badge color={STATUS_COLORS[order.status] || "grey"} size="2xsmall">
                {STATUS_LABELS[order.status] || order.status}
              </Badge>
              {order.status === "received" && order.discrepancy_count > 0 && (
                <Badge color="red" size="2xsmall">
                  {order.discrepancy_count} discrepanc{order.discrepancy_count === 1 ? "y" : "ies"}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canSubmit && (
              <Prompt>
                <Prompt.Trigger asChild>
                  <Button size="small" disabled={submitMutation.isPending}>
                    Submit Order
                  </Button>
                </Prompt.Trigger>
                <Prompt.Content>
                  <Prompt.Header>
                    <Prompt.Title>Submit Purchase Order</Prompt.Title>
                    <Prompt.Description>
                      Submit this order to the supplier? Once submitted it cannot be edited.
                    </Prompt.Description>
                  </Prompt.Header>
                  <Prompt.Footer>
                    <Prompt.Cancel>Cancel</Prompt.Cancel>
                    <Prompt.Action onClick={() => submitMutation.mutate()}>
                      Submit
                    </Prompt.Action>
                  </Prompt.Footer>
                </Prompt.Content>
              </Prompt>
            )}
            {canCancel && (
              <Prompt>
                <Prompt.Trigger asChild>
                  <Button size="small" variant="secondary">
                    Cancel Order
                  </Button>
                </Prompt.Trigger>
                <Prompt.Content>
                  <Prompt.Header>
                    <Prompt.Title>Cancel Purchase Order</Prompt.Title>
                    <Prompt.Description>
                      Are you sure? This cannot be undone.
                    </Prompt.Description>
                  </Prompt.Header>
                  <Prompt.Footer>
                    <Prompt.Cancel>Keep</Prompt.Cancel>
                    <Prompt.Action onClick={() => cancelMutation.mutate()}>
                      Cancel Order
                    </Prompt.Action>
                  </Prompt.Footer>
                </Prompt.Content>
              </Prompt>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <Text size="small" className="text-ui-fg-subtle">Supplier</Text>
            <Text>{supplierName}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">Created</Text>
            <Text>{new Date(order.created_at).toLocaleDateString()}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">Expected Delivery</Text>
            <Text>
              {order.expected_delivery_date
                ? new Date(order.expected_delivery_date).toLocaleDateString()
                : "—"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">Total Cost</Text>
            <Text className="font-semibold">
              ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </Text>
          </div>
        </div>

        {order.notes && (
          <div className="mt-4">
            <Text size="small" className="text-ui-fg-subtle">Notes</Text>
            <Text>{order.notes}</Text>
          </div>
        )}
      </Container>

      {/* ── Line Items ──────────────────────────────────────────────────────── */}
      <Container className="p-6">
        <Heading level="h2" className="mb-4">
          Line Items ({order.items.length})
        </Heading>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ui-border-base text-left text-ui-fg-subtle">
                <th className="pb-3 pr-4 font-medium">Product / Variant</th>
                <th className="pb-3 pr-4 font-medium">SKU</th>
                <th className="pb-3 pr-4 text-right font-medium">Ordered</th>
                <th className="pb-3 pr-4 text-right font-medium">Received</th>
                <th className="pb-3 pr-4 text-right font-medium">Unit Cost</th>
                <th className="pb-3 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const productTitle = item.product_variant?.product?.title || "—"
                const variantTitle = item.product_variant?.title || "—"
                const sku = item.product_variant?.sku || "—"
                const received = item.received_quantity ?? "—"
                const isShort =
                  order.status === "received" &&
                  item.received_quantity !== null &&
                  item.received_quantity < item.quantity

                return (
                  <tr
                    key={item.id}
                    className="border-b border-ui-border-base last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium">{productTitle}</div>
                      <div className="text-ui-fg-subtle">{variantTitle}</div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-ui-fg-subtle">{sku}</td>
                    <td className="py-3 pr-4 text-right">{item.quantity}</td>
                    <td className="py-3 pr-4 text-right">
                      {isShort ? (
                        <span className="text-ui-tag-red-text font-medium">
                          {received}
                        </span>
                      ) : (
                        received
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      ${item.unit_cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-medium">
                      ${(item.unit_cost * item.quantity).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ui-border-base">
                <td colSpan={5} className="pt-3 text-right font-medium">
                  Total
                </td>
                <td className="pt-3 text-right font-semibold">
                  ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Container>

      {/* ── Receive section (only when submitted) ────────────────────────── */}
      {canReceive && (
        <Container className="p-6">
          <Heading level="h2" className="mb-2">Receive Order</Heading>
          <Text className="mb-4 text-ui-fg-subtle">
            Select a stock location to receive all items into inventory.
          </Text>
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-y-2">
              <Label>Stock Location *</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <Select.Trigger className="w-64">
                  <Select.Value placeholder="Select location…" />
                </Select.Trigger>
                <Select.Content>
                  {(locationsData?.stock_locations ?? []).map((loc) => (
                    <Select.Item key={loc.id} value={loc.id}>
                      {loc.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Prompt>
              <Prompt.Trigger asChild>
                <Button
                  size="small"
                  disabled={!locationId || receiveMutation.isPending}
                  isLoading={receiveMutation.isPending}
                >
                  Mark as Received
                </Button>
              </Prompt.Trigger>
              <Prompt.Content>
                <Prompt.Header>
                  <Prompt.Title>Receive Purchase Order</Prompt.Title>
                  <Prompt.Description>
                    This will add all line items to inventory at the selected
                    location. This action cannot be undone.
                  </Prompt.Description>
                </Prompt.Header>
                <Prompt.Footer>
                  <Prompt.Cancel>Cancel</Prompt.Cancel>
                  <Prompt.Action onClick={() => receiveMutation.mutate(locationId)}>
                    Confirm Receive
                  </Prompt.Action>
                </Prompt.Footer>
              </Prompt.Content>
            </Prompt>
          </div>
        </Container>
      )}
    </div>
  )
}

export default PurchaseOrderDetailPage
