import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../../modules/purchaseDepartment/service"
import { updateSupplierWorkflow, deleteSupplierWorkflow } from "../../../../../workflows/update-supplier"
import { UpdateSupplierSchema } from "../../../../middlewares"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const purchaseService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const supplier = await purchaseService.retrieveSupplier(req.params.id).catch(() => null)

  if (!supplier) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Supplier not found")
  }

  res.json({ supplier })
}

export async function POST(
  req: AuthenticatedMedusaRequest<UpdateSupplierSchema>,
  res: MedusaResponse
) {
  const { result } = await updateSupplierWorkflow(req.scope).run({
    input: { id: req.params.id, ...req.validatedBody },
  })

  res.json({ supplier: result })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await deleteSupplierWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ id: req.params.id, object: "supplier", deleted: true })
}
