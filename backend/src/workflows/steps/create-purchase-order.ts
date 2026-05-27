import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaContainer } from "@medusajs/framework/types"
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

export async function createPurchaseOrderHandler(
  input: Input,
  { container }: { container: MedusaContainer }
) {
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService

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
}

export async function compensateCreatePurchaseOrder(
  orderId: string | undefined,
  { container }: { container: MedusaContainer }
) {
  if (!orderId) return
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  await purchaseService.deletePurchaseOrderItems({ purchase_order_id: orderId })
  await purchaseService.deletePurchaseOrders(orderId)
}

export const createPurchaseOrderStep = createStep(
  "create-purchase-order",
  createPurchaseOrderHandler,
  compensateCreatePurchaseOrder
)
