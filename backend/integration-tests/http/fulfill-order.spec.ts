import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import {
  startPickingWorkflow,
  confirmPackWorkflow,
  dispatchOrderWorkflow,
} from "../../src/workflows/fulfill-order"
import { PURCHASE_DEPARTMENT_MODULE } from "../../src/modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../src/modules/purchaseDepartment/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("fulfillment lifecycle workflows — integration", () => {
      // medusaIntegrationTestRunner truncates all tables between each `it()`.
      // The native Medusa fulfillment sync inside these steps is best-effort:
      // with no fulfillment provider configured it fails and is swallowed, so
      // the custom FulfillmentRecord remains the source of truth. These tests
      // assert that the warehouse lifecycle advances regardless.

      async function setupOrder(container: ReturnType<typeof getContainer>) {
        const productService = container.resolve<any>(Modules.PRODUCT)
        const orderService = container.resolve<any>(Modules.ORDER)
        const purchaseService =
          container.resolve<PurchaseDepartmentModuleService>(PURCHASE_DEPARTMENT_MODULE)

        const product = await productService.createProducts({
          title: "Test Pendant",
          variants: [{ title: "Gold" }],
        })
        const variantId = product.variants[0].id

        const order = await orderService.createOrders({
          email: "buyer@aurora.test",
          currency_code: "ars",
          items: [
            {
              title: "Test Pendant",
              variant_id: variantId,
              quantity: 1,
              unit_price: 1000,
            },
          ],
        })

        return { orderId: order.id, variantId, purchaseService }
      }

      it("advances an order through pick → pack → dispatch", async () => {
        const container = getContainer()
        const { orderId, variantId, purchaseService } = await setupOrder(container)

        // ── Pick ──────────────────────────────────────────────────────────────
        const { result: picked } = await startPickingWorkflow(container).run({
          input: { order_id: orderId },
        })
        expect(picked.status).toBe("picking")
        expect(Array.isArray(picked.pick_list)).toBe(true)
        expect(picked.pick_list).toHaveLength(1)
        expect(picked.pick_list[0].variant_id).toBe(variantId)
        expect(picked.pick_list[0].quantity).toBe(1)

        // ── Pack ──────────────────────────────────────────────────────────────
        const { result: packed } = await confirmPackWorkflow(container).run({
          input: {
            order_id: orderId,
            packed_weight: 0.4,
            packed_dimensions: "10x10x5",
          },
        })
        expect(packed.status).toBe("packed")
        expect(Number(packed.packed_weight)).toBe(0.4)

        // ── Dispatch ──────────────────────────────────────────────────────────
        const { result: dispatched } = await dispatchOrderWorkflow(container).run({
          input: { order_id: orderId, tracking_number: "TRACK-123" },
        })
        expect(dispatched.status).toBe("dispatched")
        expect(dispatched.tracking_number).toBe("TRACK-123")

        // ── Persisted state ───────────────────────────────────────────────────
        const [record] = await purchaseService.listFulfillmentRecords({
          order_id: orderId,
        })
        expect(record.status).toBe("dispatched")
        expect(record.tracking_number).toBe("TRACK-123")
      })

      it("rejects dispatching an order that has not been packed", async () => {
        const container = getContainer()
        const { orderId } = await setupOrder(container)

        await startPickingWorkflow(container).run({ input: { order_id: orderId } })

        const response = await dispatchOrderWorkflow(container).run({
          input: { order_id: orderId, tracking_number: "TRACK-999" },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/expected 'packed'/i)
      })

      it("rejects starting picking when the order has no line items", async () => {
        const container = getContainer()
        const orderService = container.resolve<any>(Modules.ORDER)

        const order = await orderService.createOrders({
          email: "buyer@aurora.test",
          currency_code: "ars",
        })

        const response = await startPickingWorkflow(container).run({
          input: { order_id: order.id },
          throwOnError: false,
        })

        expect(response.errors).toHaveLength(1)
        expect(response.errors[0]?.error?.message).toMatch(/no line items/i)
      })
    })
  },
})
