import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { receivePurchaseOrderWorkflow } from "../../src/workflows/receive-purchase-order"
import { PURCHASE_DEPARTMENT_MODULE } from "../../src/modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../src/modules/purchaseDepartment/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("receive-purchase-order workflow — integration", () => {
      // NOTE: medusaIntegrationTestRunner truncates all tables between each `it()` block.
      // Each test must set up its own fixtures and resolve services from a fresh container.

      async function setupFixtures(container: ReturnType<typeof getContainer>) {
        const purchaseService =
          container.resolve<PurchaseDepartmentModuleService>(PURCHASE_DEPARTMENT_MODULE)
        const inventoryService = container.resolve<any>(Modules.INVENTORY)
        const stockLocationService = container.resolve<any>(Modules.STOCK_LOCATION)
        const productService = container.resolve<any>(Modules.PRODUCT)
        const linkService = container.resolve<any>(ContainerRegistrationKeys.LINK)

        const [location] = await stockLocationService.createStockLocations([
          { name: "Test Warehouse PO-Receive" },
        ])

        const product = await productService.createProducts({
          title: "Test Ring Integration",
          variants: [{ title: "Size 7" }],
        })
        const variantId = product.variants[0].id

        const [invItem] = await inventoryService.createInventoryItems([
          { sku: "TEST-RING-INT-7" },
        ])
        const inventoryItemId = invItem.id

        await linkService.create([
          {
            [Modules.PRODUCT]: { variant_id: variantId },
            [Modules.INVENTORY]: { inventory_item_id: inventoryItemId },
          },
        ])

        await inventoryService.createInventoryLevels([
          {
            inventory_item_id: inventoryItemId,
            location_id: location.id,
            stocked_quantity: 10,
          },
        ])

        const supplier = await purchaseService.createSuppliers({
          name: "Test Supplier Integration",
        })

        return {
          locationId: location.id,
          variantId,
          inventoryItemId,
          supplierId: supplier.id,
          purchaseService,
          inventoryService,
        }
      }

      it("increments Medusa inventory level by received quantity", async () => {
        const container = getContainer()
        const { locationId, variantId, supplierId, inventoryItemId, purchaseService, inventoryService } =
          await setupFixtures(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "submitted",
        })
        await purchaseService.createPurchaseOrderItems([
          {
            purchase_order_id: po.id,
            variant_id: variantId,
            quantity: 5,
            unit_cost: 100,
          },
        ])

        await receivePurchaseOrderWorkflow(container).run({
          input: { order_id: po.id, location_id: locationId },
        })

        const [levels] = await inventoryService.listInventoryLevels({
          inventory_item_id: [inventoryItemId],
          location_id: [locationId],
        })
        expect(levels.stocked_quantity).toBe(15)
      })

      it("creates a StockAdjustmentLog record for the receipt", async () => {
        const container = getContainer()
        const { locationId, variantId, supplierId, purchaseService } =
          await setupFixtures(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "submitted",
        })
        await purchaseService.createPurchaseOrderItems([
          {
            purchase_order_id: po.id,
            variant_id: variantId,
            quantity: 3,
            unit_cost: 100,
          },
        ])

        await receivePurchaseOrderWorkflow(container).run({
          input: { order_id: po.id, location_id: locationId },
        })

        const logs = await purchaseService.listStockAdjustmentLogs({
          purchase_order_id: po.id,
        })
        expect(logs.length).toBeGreaterThan(0)
        expect(logs[0].reason_code).toBe("po_receive")
        expect(Number(logs[0].delta)).toBe(3)
      })

      it("rejects a draft PO (requires submitted status)", async () => {
        const container = getContainer()
        const { locationId, supplierId, purchaseService } = await setupFixtures(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "draft",
        })

        const response = await receivePurchaseOrderWorkflow(container).run({
          input: { order_id: po.id, location_id: locationId },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/must be submitted/i)
      })

      it("rejects an already-received PO", async () => {
        const container = getContainer()
        const { locationId, supplierId, purchaseService } = await setupFixtures(container)

        const po = await purchaseService.createPurchaseOrders({
          supplier_id: supplierId,
          status: "received",
        })

        const response = await receivePurchaseOrderWorkflow(container).run({
          input: { order_id: po.id, location_id: locationId },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/already been received/i)
      })
    })
  },
})
