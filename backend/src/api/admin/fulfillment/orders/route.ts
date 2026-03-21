import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../modules/purchaseDepartment/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const fulfillmentService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const [records, count] = await fulfillmentService.listAndCountFulfillmentRecords(
    {},
    {
      take: req.queryConfig?.pagination?.take ?? 50,
      skip: req.queryConfig?.pagination?.skip ?? 0,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    fulfillments: records,
    count,
    limit: req.queryConfig?.pagination?.take ?? 50,
    offset: req.queryConfig?.pagination?.skip ?? 0,
  })
}
