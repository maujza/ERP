import { MedusaError } from "@medusajs/framework/utils"
import { submitOrderHandler } from "../../../../src/workflows/steps/submit-purchase-order"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeService(order: { id: string; status: string }) {
  return {
    retrievePurchaseOrder: jest.fn().mockResolvedValue(order),
    updatePurchaseOrders: jest.fn().mockResolvedValue({ ...order, status: "submitted" }),
  }
}

function makeContainer(service: ReturnType<typeof makeService>) {
  return { resolve: jest.fn().mockReturnValue(service) }
}

// ─── submit handler ──────────────────────────────────────────────────────────

describe("submitOrderHandler", () => {
  it("transitions a draft order to submitted", async () => {
    const service = makeService({ id: "po_1", status: "draft" })
    const container = makeContainer(service)

    const response = await submitOrderHandler(
      { order_id: "po_1" },
      { container }
    )

    expect(service.updatePurchaseOrders).toHaveBeenCalledWith({
      id: "po_1",
      status: "submitted",
    })
    expect(response.output).toMatchObject({ status: "submitted" })
  })

  it("stores order_id in compensation data for rollback", async () => {
    const service = makeService({ id: "po_1", status: "draft" })
    const container = makeContainer(service)

    const response = await submitOrderHandler(
      { order_id: "po_1" },
      { container }
    )

    expect(response.compensateInput).toEqual({ order_id: "po_1" })
  })

  it("throws UNEXPECTED_STATE when order is already submitted", async () => {
    const service = makeService({ id: "po_1", status: "submitted" })
    const container = makeContainer(service)

    await expect(
      submitOrderHandler({ order_id: "po_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws UNEXPECTED_STATE when order is received", async () => {
    const service = makeService({ id: "po_1", status: "received" })
    const container = makeContainer(service)

    await expect(
      submitOrderHandler({ order_id: "po_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws UNEXPECTED_STATE when order is cancelled", async () => {
    const service = makeService({ id: "po_1", status: "cancelled" })
    const container = makeContainer(service)

    await expect(
      submitOrderHandler({ order_id: "po_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("error message includes the current status", async () => {
    const service = makeService({ id: "po_1", status: "received" })
    const container = makeContainer(service)

    await expect(
      submitOrderHandler({ order_id: "po_1" }, { container })
    ).rejects.toThrow(/received/)
  })
})
