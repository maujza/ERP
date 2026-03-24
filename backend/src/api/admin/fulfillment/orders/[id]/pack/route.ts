import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { confirmPackWorkflow } from "../../../../../../workflows/fulfill-order"
import { ConfirmPackSchema } from "../../../../../middlewares"

export async function POST(
  req: AuthenticatedMedusaRequest<ConfirmPackSchema>,
  res: MedusaResponse
) {
  const { result } = await confirmPackWorkflow(req.scope).run({
    input: {
      order_id: req.params.id,
      packed_weight: req.validatedBody.packed_weight,
      packed_dimensions: req.validatedBody.packed_dimensions,
    },
  })

  res.json({ fulfillment: result })
}
