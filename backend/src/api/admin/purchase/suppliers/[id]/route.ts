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

  // fill_rate is cached on the supplier record (updated on every PO receipt).
  // Use ?include_meta=true to get a live recalculation for debugging.
  const includeMeta = req.query.include_meta === "true"
  let fillRateMeta: { total_ordered: number; total_received: number; po_count: number } | undefined

  if (includeMeta) {
    const orders = await purchaseService.listPurchaseOrders({
      supplier_id: req.params.id,
      status: "received",
    })
    let totalOrdered = 0
    let totalReceived = 0
    if (orders.length > 0) {
      const items = await purchaseService.listPurchaseOrderItems({
        purchase_order_id: (orders as { id: string }[]).map((o) => o.id),
      })
      for (const item of items as { quantity?: number; received_quantity?: number }[]) {
        totalOrdered += item.quantity ?? 0
        totalReceived += item.received_quantity ?? 0
      }
    }
    fillRateMeta = { total_ordered: totalOrdered, total_received: totalReceived, po_count: orders.length }
  }

  const response: Record<string, unknown> = {
    supplier,
    fill_rate: (supplier as { fill_rate?: number | null }).fill_rate ?? null,
  }
  if (fillRateMeta) response.fill_rate_meta = fillRateMeta

  res.json(response)
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
