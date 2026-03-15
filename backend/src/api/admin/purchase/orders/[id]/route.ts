import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../../../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../../../../modules/purchaseDepartment/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const purchaseService = req.scope.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const order = await purchaseService
    .retrievePurchaseOrder(req.params.id, { relations: ["items"] })
    .catch(() => null)

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Purchase order not found")
  }

  // Also fetch linked variants via query
  const query = req.scope.resolve("query")
  const { data: itemsWithVariants } = await query.graph({
    entity: "purchase_order_item",
    fields: ["id", "variant_id", "quantity", "unit_cost", "received_quantity", "product_variant.*"],
    filters: { purchase_order_id: req.params.id },
  })

  res.json({ order: { ...order, items: itemsWithVariants } })
}
