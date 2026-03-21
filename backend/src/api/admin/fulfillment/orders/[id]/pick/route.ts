import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { startPickingWorkflow } from "../../../../../../workflows/fulfill-order"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await startPickingWorkflow(req.scope).run({
    input: { order_id: req.params.id },
  })

  res.json({ fulfillment: result })
}
