import { MedusaError } from "@medusajs/framework/utils"
import { generatePickListHandler } from "../../../../src/workflows/steps/generate-pick-list"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeOrder(items: any[]) {
  return { id: "order_1", items }
}

function makeOrderService(order: any) {
  return { retrieveOrder: jest.fn().mockResolvedValue(order) }
}

function makeQuery(sku: string | null = null, imageUrl: string | null = null) {
  return {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          id: "var_1",
          sku,
          product: imageUrl ? { images: [{ url: imageUrl }] } : null,
        },
      ],
    }),
  }
}

function makeFulfillmentService(existing: any = null) {
  return {
    listFulfillmentRecords: jest.fn().mockResolvedValue(existing ? [existing] : []),
    createFulfillmentRecords: jest
      .fn()
      .mockImplementation((data) => Promise.resolve({ id: "fr_1", ...data })),
    updateFulfillmentRecords: jest
      .fn()
      .mockImplementation((data) => Promise.resolve({ id: data.id ?? "fr_1", ...data })),
    deleteFulfillmentRecords: jest.fn().mockResolvedValue(undefined),
  }
}

function makeContainer(fulfillmentService: any, orderService: any, query: any) {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return fulfillmentService
      if (key === "order") return orderService
      if (key === "query") return query
      return {}
    }),
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("generatePickListHandler", () => {
  it("creates a FulfillmentRecord in picking status with pick list", async () => {
    const order = makeOrder([
      { variant_id: "var_1", title: "Ring Size 7", quantity: 2 },
    ])
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(
      fulfillmentService,
      makeOrderService(order),
      makeQuery("RING-7", "https://cdn.example.com/ring.jpg")
    )

    await generatePickListHandler({ order_id: "order_1" }, { container })

    expect(fulfillmentService.createFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: "order_1",
        status: "picking",
        pick_list: expect.arrayContaining([
          expect.objectContaining({
            variant_id: "var_1",
            quantity: 2,
            sku: "RING-7",
            image_url: "https://cdn.example.com/ring.jpg",
          }),
        ]),
      })
    )
  })

  it("throws when order has 0 line items", async () => {
    const container = makeContainer(
      makeFulfillmentService(null),
      makeOrderService(makeOrder([])),
      makeQuery()
    )

    await expect(
      generatePickListHandler({ order_id: "order_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is already in picking status", async () => {
    const existing = { id: "fr_1", order_id: "order_1", status: "picking" }
    const order = makeOrder([{ variant_id: "var_1", title: "Ring", quantity: 1 }])
    const container = makeContainer(
      makeFulfillmentService(existing),
      makeOrderService(order),
      makeQuery()
    )

    await expect(
      generatePickListHandler({ order_id: "order_1" }, { container })
    ).rejects.toThrow(/already in status/i)
  })

  it("throws when order is already packed", async () => {
    const existing = { id: "fr_1", order_id: "order_1", status: "packed" }
    const order = makeOrder([{ variant_id: "var_1", title: "Ring", quantity: 1 }])
    const container = makeContainer(
      makeFulfillmentService(existing),
      makeOrderService(order),
      makeQuery()
    )

    await expect(
      generatePickListHandler({ order_id: "order_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("handles items with no variant_id gracefully", async () => {
    const order = makeOrder([
      { variant_id: null, title: "Custom item", quantity: 1 },
    ])
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(
      fulfillmentService,
      makeOrderService(order),
      makeQuery()
    )

    await generatePickListHandler({ order_id: "order_1" }, { container })

    expect(fulfillmentService.createFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        pick_list: expect.arrayContaining([
          expect.objectContaining({ variant_id: null, sku: null, image_url: null }),
        ]),
      })
    )
  })
})
