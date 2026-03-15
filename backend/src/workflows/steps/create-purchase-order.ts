import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type ItemInput = {
  variant_id: string
  quantity: number
  unit_cost: number
}

type Input = {
  supplier_id: string
  reference_number?: string | null
  notes?: string | null
  expected_delivery_date?: string | null
  items: ItemInput[]
}

export const createPurchaseOrderStep = createStep(
  "create-purchase-order",
  async (input: Input, { container }) => {
    const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
      PURCHASE_DEPARTMENT_MODULE
    )

    const { items, expected_delivery_date, ...orderData } = input

    const order = await purchaseService.createPurchaseOrders({
      ...orderData,
      expected_delivery_date: expected_delivery_date
        ? new Date(expected_delivery_date)
        : null,
    })

    const orderItems = await purchaseService.createPurchaseOrderItems(
      items.map((item) => ({
        ...item,
        purchase_order_id: order.id,
      }))
    )

    return new StepResponse({ order, items: orderItems }, order.id)
  },
  async (orderId: string, { container }) => {
    const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
      PURCHASE_DEPARTMENT_MODULE
    )
    await purchaseService.deletePurchaseOrderItems({ purchase_order_id: orderId })
    await purchaseService.deletePurchaseOrders(orderId)
  }
)
