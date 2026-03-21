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

export async function receiveOrderHandler(
  input: Input,
  { container }: { container: any }
) {
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  const inventoryService = container.resolve(Modules.INVENTORY)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

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

    // Skip variants with no linked inventory items
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: { id: item.variant_id },
    })

    const variant = variants[0]
    if (!variant || !variant.inventory_items?.length) {
      continue
    }

    for (const link of variant.inventory_items as unknown as {
      inventory_item_id: string
    }[]) {
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
  { container }: { container: any }
) {
  if (!data) return

  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  const inventoryService = container.resolve(Modules.INVENTORY)

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
