import { MedusaError } from "@medusajs/framework/utils"
import { confirmPackHandler } from "../../../../src/workflows/steps/confirm-pack"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRecord(status: string) {
  return {
    id: "fr_1",
    order_id: "order_1",
    status,
    packed_weight: null,
    packed_dimensions: null,
  }
}

function makeFulfillmentService(record: any) {
  return {
    listFulfillmentRecords: jest.fn().mockResolvedValue(record ? [record] : []),
    updateFulfillmentRecords: jest
      .fn()
      .mockImplementation((data) => Promise.resolve({ ...record, ...data })),
  }
}

function makeContainer(fulfillmentService: any) {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return fulfillmentService
      return {}
    }),
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("confirmPackHandler", () => {
  it("transitions a picking order to packed with weight", async () => {
    const fulfillmentService = makeFulfillmentService(makeRecord("picking"))
    const container = makeContainer(fulfillmentService)

    await confirmPackHandler(
      { order_id: "order_1", packed_weight: 0.5, packed_dimensions: "20x15x10" },
      { container }
    )

    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fr_1",
        status: "packed",
        packed_weight: 0.5,
        packed_dimensions: "20x15x10",
      })
    )
  })

  it("throws when packed_weight is zero", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("picking")))

    await expect(
      confirmPackHandler({ order_id: "order_1", packed_weight: 0 }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when packed_weight is negative", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("picking")))

    await expect(
      confirmPackHandler({ order_id: "order_1", packed_weight: -1 }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is not in picking status", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("pending")))

    await expect(
      confirmPackHandler({ order_id: "order_1", packed_weight: 1.0 }, { container })
    ).rejects.toThrow(/expected 'picking'/i)
  })

  it("throws when order is already packed", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("packed")))

    await expect(
      confirmPackHandler({ order_id: "order_1", packed_weight: 1.0 }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when no fulfillment record exists", async () => {
    const container = makeContainer(makeFulfillmentService(null))

    await expect(
      confirmPackHandler({ order_id: "order_1", packed_weight: 1.0 }, { container })
    ).rejects.toThrow(MedusaError)
  })
})
