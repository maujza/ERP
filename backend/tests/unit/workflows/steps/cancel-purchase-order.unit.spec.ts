import { MedusaError } from "@medusajs/framework/utils"
import { cancelOrderHandler } from "../../../../src/workflows/steps/cancel-purchase-order"

function makeService(order: { id: string; status: string }) {
  return {
    retrievePurchaseOrder: jest.fn().mockResolvedValue(order),
    updatePurchaseOrders: jest.fn().mockResolvedValue({ ...order, status: "cancelled" }),
  }
}

function makeContainer(service: ReturnType<typeof makeService>) {
  return { resolve: jest.fn().mockReturnValue(service) }
}

describe("cancelOrderHandler", () => {
  it("cancels a draft order", async () => {
    const service = makeService({ id: "po_1", status: "draft" })
    const response = await cancelOrderHandler(
      { order_id: "po_1" },
      { container: makeContainer(service) }
    )
    expect(service.updatePurchaseOrders).toHaveBeenCalledWith({
      id: "po_1",
      status: "cancelled",
    })
    expect(response.output).toMatchObject({ status: "cancelled" })
  })

  it("cancels a submitted order", async () => {
    const service = makeService({ id: "po_1", status: "submitted" })
    await cancelOrderHandler({ order_id: "po_1" }, { container: makeContainer(service) })
    expect(service.updatePurchaseOrders).toHaveBeenCalledWith({
      id: "po_1",
      status: "cancelled",
    })
  })

  it("stores previous_status in compensation data", async () => {
    const service = makeService({ id: "po_1", status: "submitted" })
    const response = await cancelOrderHandler(
      { order_id: "po_1" },
      { container: makeContainer(service) }
    )
    expect(response.compensateInput).toEqual({
      order_id: "po_1",
      previous_status: "submitted",
    })
  })

  it("throws when order is already received", async () => {
    const service = makeService({ id: "po_1", status: "received" })
    await expect(
      cancelOrderHandler({ order_id: "po_1" }, { container: makeContainer(service) })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is already cancelled", async () => {
    const service = makeService({ id: "po_1", status: "cancelled" })
    await expect(
      cancelOrderHandler({ order_id: "po_1" }, { container: makeContainer(service) })
    ).rejects.toThrow(MedusaError)
  })
})
