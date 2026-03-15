import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { cancelPurchaseOrderStep } from "./steps/cancel-purchase-order"

type Input = { order_id: string }

export const cancelPurchaseOrderWorkflow = createWorkflow(
  "cancel-purchase-order",
  function (input: Input) {
    const order = cancelPurchaseOrderStep(input)
    return new WorkflowResponse(order)
  }
)

export default cancelPurchaseOrderWorkflow
