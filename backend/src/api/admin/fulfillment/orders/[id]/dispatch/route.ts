import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { dispatchOrderWorkflow } from "../../../../../../workflows/fulfill-order"
import { DispatchOrderSchema } from "../../../../../middlewares"

export async function POST(
  req: AuthenticatedMedusaRequest<DispatchOrderSchema>,
  res: MedusaResponse
) {
  const { result } = await dispatchOrderWorkflow(req.scope).run({
    input: {
      order_id: req.params.id,
      tracking_number: req.validatedBody.tracking_number,
    },
  })

  res.json({ fulfillment: result })
}
