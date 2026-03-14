import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../modules/purchaseDepartment/service"
import createSupplierWorkflow from "../../../../workflows/create-supplier"
import { CreateSupplierSchema } from "../../../middlewares"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const purchaseService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const [suppliers, count] = await purchaseService.listAndCountSuppliers(
    {},
    {
      take: req.queryConfig?.pagination?.take ?? 50,
      skip: req.queryConfig?.pagination?.skip ?? 0,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    suppliers,
    count,
    limit: req.queryConfig?.pagination?.take ?? 50,
    offset: req.queryConfig?.pagination?.skip ?? 0,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreateSupplierSchema>,
  res: MedusaResponse
) {
  const { result } = await createSupplierWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ supplier: result })
}
