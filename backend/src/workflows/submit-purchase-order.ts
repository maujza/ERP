import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { submitPurchaseOrderStep } from "./steps/submit-purchase-order"

type Input = { order_id: string }

export const submitPurchaseOrderWorkflow = createWorkflow(
  "submit-purchase-order",
  function (input: Input) {
    const order = submitPurchaseOrderStep(input)
    return new WorkflowResponse(order)
  }
)

export default submitPurchaseOrderWorkflow
