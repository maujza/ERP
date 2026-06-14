import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { submitPurchaseOrderWorkflow } from "../../src/workflows/submit-purchase-order"
import { PURCHASE_DEPARTMENT_MODULE } from "../../src/modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../src/modules/purchaseDepartment/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("submit-purchase-order workflow — integration", () => {
      // medusaIntegrationTestRunner truncates all tables between each `it()`.
      // Each test sets up its own supplier + PO from a fresh container.

      async function setupSupplier(container: ReturnType<typeof getContainer>) {
        const purchaseService =
          container.resolve<PurchaseDepartmentModuleService>(PURCHASE_DEPARTMENT_MODULE)
        const supplier = await purchaseService.createSuppliers({
          name: "Test Supplier Submit",
        })
        return { purchaseService, supplierId: supplier.id }
      }

      it("transitions a draft purchase order to submitted", async () => {
        const container = getContainer()
        const { purchaseService, supplierId } = await setupSupplier(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "draft",
        })

        const { result } = await submitPurchaseOrderWorkflow(container).run({
          input: { order_id: po.id },
        })

        expect(result.status).toBe("submitted")

        const persisted = await purchaseService.retrievePurchaseOrder(po.id)
        expect(persisted.status).toBe("submitted")
      })

      it("rejects submitting a PO that is not draft", async () => {
        const container = getContainer()
        const { purchaseService, supplierId } = await setupSupplier(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "submitted",
        })

        const response = await submitPurchaseOrderWorkflow(container).run({
          input: { order_id: po.id },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/only draft orders can be submitted/i)

        const persisted = await purchaseService.retrievePurchaseOrder(po.id)
        expect(persisted.status).toBe("submitted")
      })
    })
  },
})
