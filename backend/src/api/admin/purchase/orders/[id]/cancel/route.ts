import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import cancelPurchaseOrderWorkflow from "../../../../../../workflows/cancel-purchase-order"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await cancelPurchaseOrderWorkflow(req.scope).run({
    input: { order_id: id },
  })
  res.json({ order: result })
}
