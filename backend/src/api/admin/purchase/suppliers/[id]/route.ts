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

  // Compute fill rate = Σ received_qty / Σ ordered_qty across all received POs.
  // All data is in existing PO + PO item records — no new backend logic required.
  const orders = await purchaseService.listPurchaseOrders({
    supplier_id: req.params.id,
    status: "received",
  })

  let totalOrdered = 0
  let totalReceived = 0

  if (orders.length > 0) {
    const items = await purchaseService.listPurchaseOrderItems({
      purchase_order_id: orders.map((o: any) => o.id),
    })
    for (const item of items as any[]) {
      totalOrdered += item.quantity ?? 0
      totalReceived += item.received_quantity ?? 0
    }
  }

  const fillRate = totalOrdered > 0
    ? Math.round((totalReceived / totalOrdered) * 100)
    : null

  res.json({
    supplier,
    fill_rate: fillRate,
    fill_rate_meta: {
      total_ordered: totalOrdered,
      total_received: totalReceived,
      po_count: orders.length,
    },
  })
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
