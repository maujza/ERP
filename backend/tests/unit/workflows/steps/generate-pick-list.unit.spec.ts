import { MedusaError } from "@medusajs/framework/utils"
import {
  generatePickListHandler,
  compensateGeneratePickList,
} from "../../../../src/workflows/steps/generate-pick-list"

const mockCreateOrderFulfillmentRun = jest.fn()
const mockCancelOrderFulfillmentRun = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  createOrderFulfillmentWorkflow: jest.fn(() => ({
    run: mockCreateOrderFulfillmentRun,
  })),
  cancelOrderFulfillmentWorkflow: jest.fn(() => ({
    run: mockCancelOrderFulfillmentRun,
  })),
}))

// ─── helpers ────────────────────────────────────────────────────────────────

function makeOrder(items: any[], fulfillments: any[] = []) {
  return { id: "order_1", items, fulfillments }
}

function makeOrderService(order: any) {
  return { retrieveOrder: jest.fn().mockResolvedValue(order) }
}

function makeQuery(sku: string | null = null, imageUrl: string | null = null) {
  return {
    graph: jest.fn().mockImplementation(({ entity }: { entity: string }) => {
      if (entity === "product_variant") {
        return Promise.resolve({
          data: [
            {
              id: "var_1",
              sku,
              product: imageUrl ? { images: [{ url: imageUrl }] } : null,
            },
          ],
        })
      }

      if (entity === "order") {
        return Promise.resolve({
          data: [{ id: "order_1", fulfillments: [] }],
        })
      }

      return Promise.resolve({ data: [] })
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
  const logger = { warn: jest.fn() }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return fulfillmentService
      if (key === "order") return orderService
      if (key === "query") return query
      if (key === "logger") return logger
      return {}
    }),
    _logger: logger,
  }
  return container
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("generatePickListHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateOrderFulfillmentRun.mockResolvedValue({
      result: { id: "ful_1" },
    })
    mockCancelOrderFulfillmentRun.mockResolvedValue({ result: undefined })
  })

  it("creates a FulfillmentRecord in picking status with pick list", async () => {
    const order = makeOrder([
      { id: "item_1", variant_id: "var_1", title: "Ring Size 7", quantity: 2 },
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

    expect(mockCreateOrderFulfillmentRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_1",
        items: [{ id: "item_1", quantity: 2 }],
      },
    })
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
    const order = makeOrder([{ id: "item_1", variant_id: "var_1", title: "Ring", quantity: 1 }])
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
    const order = makeOrder([{ id: "item_1", variant_id: "var_1", title: "Ring", quantity: 1 }])
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
      { id: "item_1", variant_id: null, title: "Custom item", quantity: 1 },
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

  it("reuses an existing native fulfillment on the order", async () => {
    const order = makeOrder(
      [{ id: "item_1", variant_id: "var_1", title: "Ring", quantity: 1 }],
      []
    )
    const fulfillmentService = makeFulfillmentService(null)
    const query = makeQuery()
    query.graph = jest.fn().mockImplementation(({ entity }: { entity: string }) => {
      if (entity === "product_variant") {
        return Promise.resolve({
          data: [{ id: "var_1", sku: null, product: null }],
        })
      }

      if (entity === "order") {
        return Promise.resolve({
          data: [{ id: "order_1", fulfillments: [{ id: "ful_existing" }] }],
        })
      }

      return Promise.resolve({ data: [] })
    })
    const container = makeContainer(
      fulfillmentService,
      makeOrderService(order),
      query
    )

    await generatePickListHandler({ order_id: "order_1" }, { container })

    expect(mockCreateOrderFulfillmentRun).not.toHaveBeenCalled()
    expect(fulfillmentService.createFulfillmentRecords).toHaveBeenCalled()
  })

  it("continues without throwing when createOrderFulfillmentWorkflow fails (e.g. demo orders)", async () => {
    mockCreateOrderFulfillmentRun.mockRejectedValue(new Error("No fulfillment provider configured"))
    const order = makeOrder([
      { id: "item_1", variant_id: "var_1", title: "Ring", quantity: 1 },
    ])
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(fulfillmentService, makeOrderService(order), makeQuery())

    await expect(
      generatePickListHandler({ order_id: "order_1" }, { container })
    ).resolves.not.toThrow()

    // FulfillmentRecord still created
    expect(fulfillmentService.createFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({ order_id: "order_1", status: "picking" })
    )
    // Warning logged
    expect(container._logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping native fulfillment")
    )
  })

  // ─── compensation tests ──────────────────────────────────────────────────────

  it("compensation reverts existing record to pending with null pick_list", async () => {
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(fulfillmentService, makeOrderService(makeOrder([])), makeQuery())

    await compensateGeneratePickList(
      {
        order_id: "order_1",
        record_id: "fr_1",
        was_existing: true,
        created_native_fulfillment_id: null,
      },
      { container }
    )

    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith({
      id: "fr_1",
      status: "pending",
      pick_list: null,
    })
    expect(fulfillmentService.deleteFulfillmentRecords).not.toHaveBeenCalled()
    expect(mockCancelOrderFulfillmentRun).not.toHaveBeenCalled()
  })

  it("compensation deletes new record when was_existing is false", async () => {
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(fulfillmentService, makeOrderService(makeOrder([])), makeQuery())

    await compensateGeneratePickList(
      {
        order_id: "order_1",
        record_id: "fr_new",
        was_existing: false,
        created_native_fulfillment_id: null,
      },
      { container }
    )

    expect(fulfillmentService.deleteFulfillmentRecords).toHaveBeenCalledWith("fr_new")
    expect(fulfillmentService.updateFulfillmentRecords).not.toHaveBeenCalled()
    expect(mockCancelOrderFulfillmentRun).not.toHaveBeenCalled()
  })

  it("compensation cancels native Medusa fulfillment when created_native_fulfillment_id is set", async () => {
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(fulfillmentService, makeOrderService(makeOrder([])), makeQuery())

    await compensateGeneratePickList(
      {
        order_id: "order_1",
        record_id: "fr_new",
        was_existing: false,
        created_native_fulfillment_id: "ful_created",
      },
      { container }
    )

    expect(mockCancelOrderFulfillmentRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_1",
        fulfillment_id: "ful_created",
      },
    })
  })

  it("compensation is a no-op when data is undefined", async () => {
    const fulfillmentService = makeFulfillmentService(null)
    const container = makeContainer(fulfillmentService, makeOrderService(makeOrder([])), makeQuery())

    await compensateGeneratePickList(undefined, { container })

    expect(fulfillmentService.updateFulfillmentRecords).not.toHaveBeenCalled()
    expect(fulfillmentService.deleteFulfillmentRecords).not.toHaveBeenCalled()
    expect(mockCancelOrderFulfillmentRun).not.toHaveBeenCalled()
  })

  it("multi-item order produces pick list with one entry per line item", async () => {
    const order = makeOrder([
      { id: "item_1", variant_id: "var_1", title: "Ring Size 7", quantity: 1 },
      { id: "item_2", variant_id: "var_2", title: "Necklace Gold", quantity: 2 },
      { id: "item_3", variant_id: null, title: "Gift Wrap", quantity: 1 },
    ])
    const fulfillmentService = makeFulfillmentService(null)
    const query = {
      graph: jest.fn().mockImplementation(({ entity }: { entity: string }) => {
        if (entity === "product_variant") {
          return Promise.resolve({
            data: [
              { id: "var_1", sku: "RING-7", product: { images: [{ url: "https://cdn.example.com/ring.jpg" }] } },
              { id: "var_2", sku: "NECK-G", product: null },
            ],
          })
        }
        if (entity === "order") {
          return Promise.resolve({ data: [{ id: "order_1", fulfillments: [] }] })
        }
        return Promise.resolve({ data: [] })
      }),
    }
    const container = makeContainer(fulfillmentService, makeOrderService(order), query)

    await generatePickListHandler({ order_id: "order_1" }, { container })

    const callArg = fulfillmentService.createFulfillmentRecords.mock.calls[0][0]
    expect(callArg.pick_list).toHaveLength(3)
    expect(callArg.pick_list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variant_id: "var_1", title: "Ring Size 7", quantity: 1, sku: "RING-7" }),
        expect.objectContaining({ variant_id: "var_2", title: "Necklace Gold", quantity: 2, sku: "NECK-G" }),
        expect.objectContaining({ variant_id: null, title: "Gift Wrap", quantity: 1, sku: null }),
      ])
    )
  })

  it("existing pending record is updated to picking and not duplicated", async () => {
    const existingPending = { id: "fr_pending", order_id: "order_1", status: "pending" }
    const order = makeOrder([
      { id: "item_1", variant_id: "var_1", title: "Bracelet", quantity: 1 },
    ])
    const fulfillmentService = makeFulfillmentService(existingPending)
    const container = makeContainer(
      fulfillmentService,
      makeOrderService(order),
      makeQuery("BRAC-1", null)
    )

    await generatePickListHandler({ order_id: "order_1" }, { container })

    expect(fulfillmentService.createFulfillmentRecords).not.toHaveBeenCalled()
    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fr_pending",
        status: "picking",
        pick_list: expect.arrayContaining([
          expect.objectContaining({ variant_id: "var_1", sku: "BRAC-1" }),
        ]),
      })
    )
  })
})
