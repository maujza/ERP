import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import submitPurchaseOrderWorkflow from "../../../../../../workflows/submit-purchase-order"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await submitPurchaseOrderWorkflow(req.scope).run({
    input: { order_id: id },
  })
  res.json({ order: result })
}
