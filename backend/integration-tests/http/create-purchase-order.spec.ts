import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import createPurchaseOrderWorkflow from "../../src/workflows/create-purchase-order"
import { PURCHASE_DEPARTMENT_MODULE } from "../../src/modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../src/modules/purchaseDepartment/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("create-purchase-order workflow — integration", () => {
      async function setupFixtures(container: ReturnType<typeof getContainer>) {
        const purchaseService =
          container.resolve<PurchaseDepartmentModuleService>(PURCHASE_DEPARTMENT_MODULE)
        const productService = container.resolve<any>("product")

        const product = await productService.createProducts({
          title: "Test Shared Variant",
          variants: [{ title: "Default" }],
        })

        const supplier = await purchaseService.createSuppliers({
          name: "Test Supplier Shared Variant",
        })

        return {
          purchaseService,
          supplierId: supplier.id,
          variantId: product.variants[0].id,
        }
      }

      it("allows creating multiple purchase orders with the same variant", async () => {
        const container = getContainer()
        const { purchaseService, supplierId, variantId } = await setupFixtures(container)

        const first = await createPurchaseOrderWorkflow(container).run({
          input: {
            supplier_id: supplierId,
            reference_number: "PO-LINK-001",
            items: [{ variant_id: variantId, quantity: 1, unit_cost: 10 }],
          },
        })

        const second = await createPurchaseOrderWorkflow(container).run({
          input: {
            supplier_id: supplierId,
            reference_number: "PO-LINK-002",
            items: [{ variant_id: variantId, quantity: 2, unit_cost: 12 }],
          },
        })

        expect(first.result.order.id).toBeTruthy()
        expect(second.result.order.id).toBeTruthy()
        expect(first.result.order.id).not.toBe(second.result.order.id)

        const [orders, count] = await purchaseService.listAndCountPurchaseOrders(
          { supplier_id: supplierId },
          { order: { created_at: "ASC" } }
        )

        expect(count).toBe(2)
        expect(orders.map((o) => o.reference_number)).toEqual(["PO-LINK-001", "PO-LINK-002"])
      })
    })
  },
})
