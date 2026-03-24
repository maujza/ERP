import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../../modules/purchaseDepartment/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const fulfillmentService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const [record] = await fulfillmentService.listFulfillmentRecords({
    order_id: req.params.id,
  })

  if (!record) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No fulfillment record found for order ${req.params.id}`
    )
  }

  res.json({ fulfillment: record })
}
