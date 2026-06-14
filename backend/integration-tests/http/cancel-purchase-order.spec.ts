import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { cancelPurchaseOrderWorkflow } from "../../src/workflows/cancel-purchase-order"
import { PURCHASE_DEPARTMENT_MODULE } from "../../src/modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../src/modules/purchaseDepartment/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("cancel-purchase-order workflow — integration", () => {
      // medusaIntegrationTestRunner truncates all tables between each `it()`.
      // Each test sets up its own supplier + PO from a fresh container.

      async function setupSupplier(container: ReturnType<typeof getContainer>) {
        const purchaseService =
          container.resolve<PurchaseDepartmentModuleService>(PURCHASE_DEPARTMENT_MODULE)
        const supplier = await purchaseService.createSuppliers({
          name: "Test Supplier Cancel",
        })
        return { purchaseService, supplierId: supplier.id }
      }

      it("cancels a draft purchase order", async () => {
        const container = getContainer()
        const { purchaseService, supplierId } = await setupSupplier(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "draft",
        })

        const { result } = await cancelPurchaseOrderWorkflow(container).run({
          input: { order_id: po.id },
        })

        expect(result.status).toBe("cancelled")

        const persisted = await purchaseService.retrievePurchaseOrder(po.id)
        expect(persisted.status).toBe("cancelled")
      })

      it("cancels a submitted purchase order", async () => {
        const container = getContainer()
        const { purchaseService, supplierId } = await setupSupplier(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "submitted",
        })

        const { result } = await cancelPurchaseOrderWorkflow(container).run({
          input: { order_id: po.id },
        })

        expect(result.status).toBe("cancelled")
      })

      it("rejects cancelling an already-received PO", async () => {
        const container = getContainer()
        const { purchaseService, supplierId } = await setupSupplier(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "received",
        })

        const response = await cancelPurchaseOrderWorkflow(container).run({
          input: { order_id: po.id },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/already been received/i)

        const persisted = await purchaseService.retrievePurchaseOrder(po.id)
        expect(persisted.status).toBe("received")
      })

      it("rejects cancelling an already-cancelled PO", async () => {
        const container = getContainer()
        const { purchaseService, supplierId } = await setupSupplier(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "cancelled",
        })

        const response = await cancelPurchaseOrderWorkflow(container).run({
          input: { order_id: po.id },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/already cancelled/i)
      })
    })
  },
})
