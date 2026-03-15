import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../modules/purchaseDepartment/service"
import createPurchaseOrderWorkflow from "../../../../workflows/create-purchase-order"
import { CreatePurchaseOrderSchema } from "../../../middlewares"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const purchaseService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const [orders, count] = await purchaseService.listAndCountPurchaseOrders(
    {},
    {
      take: req.queryConfig?.pagination?.take ?? 50,
      skip: req.queryConfig?.pagination?.skip ?? 0,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    orders,
    count,
    limit: req.queryConfig?.pagination?.take ?? 50,
    offset: req.queryConfig?.pagination?.skip ?? 0,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreatePurchaseOrderSchema>,
  res: MedusaResponse
) {
  const { result } = await createPurchaseOrderWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json(result)
}
