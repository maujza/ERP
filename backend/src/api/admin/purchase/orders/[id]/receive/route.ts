import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import receivePurchaseOrderWorkflow from "../../../../../../workflows/receive-purchase-order"
import { ReceivePurchaseOrderSchema } from "../../../../../middlewares"

export async function POST(
  req: AuthenticatedMedusaRequest<ReceivePurchaseOrderSchema>,
  res: MedusaResponse
) {
  const { result } = await receivePurchaseOrderWorkflow(req.scope).run({
    input: {
      order_id: req.params.id,
      location_id: req.validatedBody.location_id,
    },
  })

  res.json({ order: result })
}
