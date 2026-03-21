import { MedusaError } from "@medusajs/framework/utils"
import { dispatchOrderHandler } from "../../../../src/workflows/steps/dispatch-order"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRecord(status: string, extra: any = {}) {
  return { id: "fr_1", order_id: "order_1", status, tracking_number: null, ...extra }
}

function makeFulfillmentService(record: any) {
  return {
    listFulfillmentRecords: jest.fn().mockResolvedValue(record ? [record] : []),
    updateFulfillmentRecords: jest
      .fn()
      .mockImplementation((data) => Promise.resolve({ ...record, ...data })),
  }
}

function makeMedusaFulfillmentService(fulfillments: any[] = []) {
  return {
    listFulfillments: jest.fn().mockResolvedValue(fulfillments),
    createShipment: jest.fn().mockResolvedValue({}),
  }
}

function makeContainer(
  fulfillmentService: any,
  medusaFulfillmentService: any = makeMedusaFulfillmentService()
) {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return fulfillmentService
      if (key === "fulfillment") return medusaFulfillmentService
      return {}
    }),
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("dispatchOrderHandler", () => {
  it("transitions a packed order to dispatched with tracking number", async () => {
    const record = makeRecord("packed")
    const fulfillmentService = makeFulfillmentService(record)
    const container = makeContainer(fulfillmentService)

    await dispatchOrderHandler(
      { order_id: "order_1", tracking_number: "TRK-12345" },
      { container }
    )

    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fr_1",
        status: "dispatched",
        tracking_number: "TRK-12345",
      })
    )
  })

  it("returns no-op when order is already dispatched (idempotency)", async () => {
    const record = makeRecord("dispatched", { tracking_number: "TRK-OLD" })
    const fulfillmentService = makeFulfillmentService(record)
    const container = makeContainer(fulfillmentService)

    const response = await dispatchOrderHandler(
      { order_id: "order_1", tracking_number: "TRK-DUPLICATE" },
      { container }
    )

    expect(fulfillmentService.updateFulfillmentRecords).not.toHaveBeenCalled()
    expect(response.compensateInput).toBeNull()
  })

  it("throws when tracking_number is empty string", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("packed")))

    await expect(
      dispatchOrderHandler({ order_id: "order_1", tracking_number: "" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is not in packed status", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("picking")))

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).rejects.toThrow(/expected 'packed'/i)
  })

  it("throws 503-style error when Medusa fulfillment service is unavailable", async () => {
    const fulfillmentService = makeFulfillmentService(makeRecord("packed"))
    const brokenMedusaFulfillmentService = {
      listFulfillments: jest.fn().mockRejectedValue(new Error("Service unavailable")),
      createShipment: jest.fn(),
    }
    const container = makeContainer(fulfillmentService, brokenMedusaFulfillmentService)

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).rejects.toThrow(/fulfillment service unavailable/i)
  })

  it("does NOT update FulfillmentRecord when Medusa fulfillment service fails", async () => {
    const fulfillmentService = makeFulfillmentService(makeRecord("packed"))
    const brokenMedusaFulfillmentService = {
      listFulfillments: jest.fn().mockRejectedValue(new Error("Service unavailable")),
      createShipment: jest.fn(),
    }
    const container = makeContainer(fulfillmentService, brokenMedusaFulfillmentService)

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).rejects.toThrow()

    // FulfillmentRecord must remain in 'packed' — no update was called
    expect(fulfillmentService.updateFulfillmentRecords).not.toHaveBeenCalled()
  })

  it("throws when no fulfillment record exists", async () => {
    const container = makeContainer(makeFulfillmentService(null))

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).rejects.toThrow(MedusaError)
  })
})
