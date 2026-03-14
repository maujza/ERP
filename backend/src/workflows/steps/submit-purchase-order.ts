import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = { order_id: string }
type CompensationData = { order_id: string }

export async function submitOrderHandler(
  input: Input,
  { container }: { container: any }
) {
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService

  const order = await purchaseService.retrievePurchaseOrder(input.order_id)

  if (order.status !== "draft") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Cannot submit order with status "${order.status}". Only draft orders can be submitted.`
    )
  }

  const updated = await purchaseService.updatePurchaseOrders({
    id: input.order_id,
    status: "submitted",
  })

  return new StepResponse(updated, { order_id: input.order_id } as CompensationData)
}

async function compensateSubmitOrder(
  data: CompensationData | undefined,
  { container }: { container: any }
) {
  if (!data) return
  const purchaseService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  await purchaseService.updatePurchaseOrders({ id: data.order_id, status: "draft" })
}

export const submitPurchaseOrderStep = createStep(
  "submit-purchase-order",
  submitOrderHandler,
  compensateSubmitOrder
)
