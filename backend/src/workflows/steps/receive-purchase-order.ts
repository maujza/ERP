import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = {
  order_id: string
  location_id: string
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

  const adjustments: AdjustmentRecord[] = []
  const itemQuantities: ItemQuantityRecord[] = []

  for (const item of order.items) {
    itemQuantities.push({
      id: item.id,
      previous_received_quantity: item.received_quantity ?? 0,
    })

    await purchaseService.updatePurchaseOrderItems({
      id: item.id,
      received_quantity: item.quantity,
    })

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.id"],
      filters: { id: item.variant_id },
    })

    const variant = variants[0]
    if (!variant || !variant.inventory_items?.length) {
      continue
    }

    for (const invItem of variant.inventory_items as unknown as { id: string }[]) {
      await inventoryService.adjustInventory(
        invItem.id,
        input.location_id,
        item.quantity
      )
      adjustments.push({
        inventory_item_id: invItem.id,
        location_id: input.location_id,
        quantity: item.quantity,
      })
    }
  }

  const updatedOrder = await purchaseService.updatePurchaseOrders({
    id: input.order_id,
    status: "received",
  })

  return new StepResponse(updatedOrder, {
    order_id: input.order_id,
    previous_status: order.status,
    adjustments,
    item_quantities: itemQuantities,
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
  })
}

export const receivePurchaseOrderStep = createStep(
  "receive-purchase-order",
  receiveOrderHandler,
  compensateReceiveOrder
)
