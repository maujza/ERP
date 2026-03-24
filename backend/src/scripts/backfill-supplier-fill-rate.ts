/**
 * Backfill fill_rate for all existing suppliers.
 *
 * Run once after the Migration20260322000001 migration:
 *   npx medusa exec ./src/scripts/backfill-supplier-fill-rate.ts
 */
import { MedusaContainer } from "@medusajs/framework/types"
import { PURCHASE_DEPARTMENT_MODULE } from "../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../modules/purchaseDepartment/service"

export default async function backfillSupplierFillRate(container: MedusaContainer) {
  const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
    PURCHASE_DEPARTMENT_MODULE
  )

  const suppliers = await purchaseService.listSuppliers({})
  console.log(`Backfilling fill_rate for ${suppliers.length} supplier(s)...`)

  let updated = 0
  let skipped = 0

  for (const supplier of suppliers as { id: string }[]) {
    try {
      const receivedOrders = await purchaseService.listPurchaseOrders({
        supplier_id: supplier.id,
        status: "received",
      })

      let totalOrdered = 0
      let totalReceived = 0

      if (receivedOrders.length > 0) {
        const items = await purchaseService.listPurchaseOrderItems({
          purchase_order_id: (receivedOrders as { id: string }[]).map((o) => o.id),
        })
        for (const item of items as { quantity?: number; received_quantity?: number }[]) {
          totalOrdered += item.quantity ?? 0
          totalReceived += item.received_quantity ?? 0
        }
      }

      const fillRate = totalOrdered > 0
        ? Math.round((totalReceived / totalOrdered) * 100)
        : null

      await purchaseService.updateSuppliers({ id: supplier.id, fill_rate: fillRate })
      console.log(`  ✓ ${supplier.id}: fill_rate = ${fillRate ?? "null (no received POs)"}`)
      updated++
    } catch (err: unknown) {
      console.error(`  ✗ ${supplier.id}: failed — ${err instanceof Error ? err.message : String(err)}`)
      skipped++
    }
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}`)
}
