import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = { order_id: string }
type CompensationData = { order_id: string; previous_status: string }

export async function cancelOrderHandler(
  input: Input,
  { container }: { container: MedusaContainer }
) {
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService

  const order = await purchaseService.retrievePurchaseOrder(input.order_id)

  if (order.status === "received") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Cannot cancel a purchase order that has already been received"
    )
  }

  if (order.status === "cancelled") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Purchase order is already cancelled"
    )
  }

  const updated = await purchaseService.updatePurchaseOrders({
    id: input.order_id,
    status: "cancelled",
  })

  return new StepResponse(updated, {
    order_id: input.order_id,
    previous_status: order.status,
  } as CompensationData)
}

async function compensateCancelOrder(
  data: CompensationData | undefined,
  { container }: { container: MedusaContainer }
) {
  if (!data) return
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  await purchaseService.updatePurchaseOrders({
    id: data.order_id,
    status: data.previous_status as "draft" | "submitted" | "received" | "cancelled",
  })
}

export const cancelPurchaseOrderStep = createStep(
  "cancel-purchase-order",
  cancelOrderHandler,
  compensateCancelOrder
)
