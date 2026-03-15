import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { receivePurchaseOrderStep } from "./steps/receive-purchase-order"

type Input = {
  order_id: string
  location_id: string
}

export const receivePurchaseOrderWorkflow = createWorkflow(
  "receive-purchase-order",
  function (input: Input) {
    const order = receivePurchaseOrderStep(input)
    return new WorkflowResponse(order)
  }
)

export default receivePurchaseOrderWorkflow
