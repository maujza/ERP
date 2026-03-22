import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"
import { StockAdjustmentReasonCode } from "../../modules/purchaseDepartment/models/stock-adjustment-log"

type ItemOverride = {
  id: string
  received_quantity: number
}

type Input = {
  order_id: string
  location_id: string
  // Optional per-item overrides. When omitted, each item is fully received
  // (received_quantity = ordered quantity). When provided, partial receipt is
  // supported and discrepancy_count is computed.
  items?: ItemOverride[]
}

type AdjustmentRecord = {
  inventory_item_id: string
  location_id: string
  quantity: number
}

type ItemQuantityRecord = {
  id: string
  previous_received_quantity: number
}

type CompensationData = {
  order_id: string
  previous_status: string
  adjustments: AdjustmentRecord[]
  item_quantities: ItemQuantityRecord[]
  log_ids: string[]
}

type VariantInventoryLink = { inventory_item_id: string }
type VariantRow = { id: string; inventory_items?: VariantInventoryLink[] }

export async function receiveOrderHandler(
  input: Input,
  { container }: { container: unknown }
) {
  const cont = container as { resolve: (key: string) => unknown }
  const purchaseService = cont.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  const inventoryService = cont.resolve(Modules.INVENTORY) as {
    adjustInventory: (itemId: string, locationId: string, qty: number) => Promise<unknown>
  }
  const query = cont.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
  }

  const order = await purchaseService.retrievePurchaseOrder(input.order_id, {
    relations: ["items"],
  })

  // Status guard — only submitted POs can be received
  if (order.status !== "submitted") {
    if (order.status === "received") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Purchase order has already been received"
      )
    }
    if (order.status === "cancelled") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Cannot receive a cancelled purchase order"
      )
    }
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Purchase order must be submitted before it can be received"
    )
  }

  // Build a map of per-item received quantities from the override list
  const overrideMap = new Map<string, number>(
    (input.items ?? []).map((o) => [o.id, o.received_quantity])
  )

  // Batch-fetch all variant → inventory_item links in a single query (avoids N+1)
  const allVariantIds = order.items.map((item) => item.variant_id)
  const { data: variantRows } = await query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.inventory_item_id"],
    filters: { id: allVariantIds },
  })
  const variantMap = new Map<string, VariantRow>(
    (variantRows as VariantRow[]).map((v) => [v.id, v])
  )

  const adjustments: AdjustmentRecord[] = []
  const itemQuantities: ItemQuantityRecord[] = []
  const logIds: string[] = []
  let discrepancyCount = 0

  for (const item of order.items) {
    // Use override quantity if provided, otherwise receive full ordered qty
    const receivedQty = overrideMap.has(item.id)
      ? overrideMap.get(item.id)!
      : item.quantity

    itemQuantities.push({
      id: item.id,
      previous_received_quantity: item.received_quantity ?? 0,
    })

    await purchaseService.updatePurchaseOrderItems({
      id: item.id,
      received_quantity: receivedQty,
    })

    if (receivedQty !== item.quantity) {
      discrepancyCount++
    }

    // Look up variant from the pre-fetched batch map
    const variant = variantMap.get(item.variant_id)
    if (!variant?.inventory_items?.length) {
      continue
    }

    for (const link of variant.inventory_items) {
      await inventoryService.adjustInventory(
        link.inventory_item_id,
        input.location_id,
        receivedQty
      )
      adjustments.push({
        inventory_item_id: link.inventory_item_id,
        location_id: input.location_id,
        quantity: receivedQty,
      })

      // Insert audit log entry — if this fails the step compensates (rolls back
      // all inventory adjustments and reverts item quantities + order status)
      const [log] = await purchaseService.createStockAdjustmentLogs([
        {
          variant_id: item.variant_id,
          location_id: input.location_id,
          delta: receivedQty,
          reason_code: "po_receive" as StockAdjustmentReasonCode,
          purchase_order_id: input.order_id,
          actor_id: null,
        },
      ])
      logIds.push(log.id)
    }
  }

  const updatedOrder = await purchaseService.updatePurchaseOrders({
    id: input.order_id,
    status: "received",
    discrepancy_count: discrepancyCount,
  })

  // Recompute and cache fill rate on the supplier (write-time caching).
  // The current order is now "received" so it's included in this query.
  try {
    const receivedOrders = await purchaseService.listPurchaseOrders({
      supplier_id: order.supplier_id,
      status: "received",
    })
    let totalOrdered = 0
    let totalReceived = 0
    if (receivedOrders.length > 0) {
      const allItems = await purchaseService.listPurchaseOrderItems({
        purchase_order_id: (receivedOrders as { id: string }[]).map((o) => o.id),
      })
      for (const item of allItems as { quantity?: number; received_quantity?: number }[]) {
        totalOrdered += item.quantity ?? 0
        totalReceived += item.received_quantity ?? 0
      }
    }
    const newFillRate = totalOrdered > 0
      ? Math.round((totalReceived / totalOrdered) * 100)
      : null
    await purchaseService.updateSuppliers({ id: order.supplier_id, fill_rate: newFillRate })
  } catch (err: unknown) {
    // Non-critical — fill rate cache update failure should not roll back the receipt
    const logger = cont.resolve("logger") as { warn: (msg: string, meta?: Record<string, unknown>) => void }
    logger.warn("[receive-purchase-order] Failed to update supplier fill_rate cache", {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return new StepResponse(updatedOrder, {
    order_id: input.order_id,
    previous_status: order.status,
    adjustments,
    item_quantities: itemQuantities,
    log_ids: logIds,
  } as CompensationData)
}

async function compensateReceiveOrder(
  data: CompensationData | undefined,
  { container }: { container: unknown }
) {
  if (!data) return

  const cont = container as { resolve: (key: string) => unknown }
  const purchaseService = cont.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  const inventoryService = cont.resolve(Modules.INVENTORY) as {
    adjustInventory: (itemId: string, locationId: string, qty: number) => Promise<unknown>
  }

  // Delete audit log entries created by this step
  if (data.log_ids?.length) {
    await purchaseService.deleteStockAdjustmentLogs(data.log_ids)
  }

  // Reverse inventory adjustments in reverse order
  for (const adj of [...data.adjustments].reverse()) {
    await inventoryService.adjustInventory(
      adj.inventory_item_id,
      adj.location_id,
      -adj.quantity
    )
  }

  // Revert item received_quantities
  for (const iq of data.item_quantities) {
    await purchaseService.updatePurchaseOrderItems({
      id: iq.id,
      received_quantity: iq.previous_received_quantity,
    })
  }

  // Revert order status
  await purchaseService.updatePurchaseOrders({
    id: data.order_id,
    status: data.previous_status as "draft" | "submitted" | "received" | "cancelled",
    discrepancy_count: 0,
  })
}

export const receivePurchaseOrderStep = createStep(
  "receive-purchase-order",
  receiveOrderHandler,
  compensateReceiveOrder
)
