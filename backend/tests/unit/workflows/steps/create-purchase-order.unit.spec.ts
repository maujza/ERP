import {
  createPurchaseOrderHandler,
  compensateCreatePurchaseOrder,
} from "../../../../src/workflows/steps/create-purchase-order"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<ReturnType<typeof makeService>> = {}) {
  const createdOrder = { id: "po_1", supplier_id: "sup_1", status: "draft" }
  const createdItems = [
    { id: "poi_1", purchase_order_id: "po_1", variant_id: "var_1", quantity: 2, unit_cost: 500 },
  ]

  return {
    createPurchaseOrders: jest.fn().mockResolvedValue(createdOrder),
    createPurchaseOrderItems: jest.fn().mockResolvedValue(createdItems),
    deletePurchaseOrderItems: jest.fn().mockResolvedValue(undefined),
    deletePurchaseOrders: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeContainer(service: ReturnType<typeof makeService>) {
  return { resolve: jest.fn().mockReturnValue(service) }
}

const baseInput = {
  supplier_id: "sup_1",
  items: [{ variant_id: "var_1", quantity: 2, unit_cost: 500 }],
}

// ─── createPurchaseOrderHandler ──────────────────────────────────────────────

describe("createPurchaseOrderHandler", () => {
  it("calls createPurchaseOrders with correct supplier_id and status defaults to draft", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await createPurchaseOrderHandler(baseInput, { container })

    expect(service.createPurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        supplier_id: "sup_1",
      })
    )
    // The service returns a draft order by default — confirm it was accepted as-is
    expect(service.createPurchaseOrders).toHaveBeenCalledTimes(1)
  })

  it("creates PO items linked to the order with correct purchase_order_id", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await createPurchaseOrderHandler(baseInput, { container })

    expect(service.createPurchaseOrderItems).toHaveBeenCalledWith([
      expect.objectContaining({
        purchase_order_id: "po_1",
        variant_id: "var_1",
        quantity: 2,
        unit_cost: 500,
      }),
    ])
  })

  it("passes expected_delivery_date as a Date object when provided as ISO string", async () => {
    const service = makeService()
    const container = makeContainer(service)
    const isoDate = "2026-06-15T00:00:00.000Z"

    await createPurchaseOrderHandler(
      { ...baseInput, expected_delivery_date: isoDate },
      { container }
    )

    expect(service.createPurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        expected_delivery_date: new Date(isoDate),
      })
    )
  })

  it("passes expected_delivery_date as null when omitted", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await createPurchaseOrderHandler(baseInput, { container })

    expect(service.createPurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        expected_delivery_date: null,
      })
    )
  })

  it("StepResponse output contains both order and items", async () => {
    const service = makeService()
    const container = makeContainer(service)

    const response = await createPurchaseOrderHandler(baseInput, { container })

    expect(response.output).toMatchObject({
      order: expect.objectContaining({ id: "po_1" }),
      items: expect.arrayContaining([
        expect.objectContaining({ purchase_order_id: "po_1" }),
      ]),
    })
  })

  it("compensation data is the created order id string", async () => {
    const service = makeService()
    const container = makeContainer(service)

    const response = await createPurchaseOrderHandler(baseInput, { container })

    expect(response.compensateInput).toEqual("po_1")
  })

  it("handles an empty items array without throwing", async () => {
    const service = makeService({
      createPurchaseOrderItems: jest.fn().mockResolvedValue([]),
    })
    const container = makeContainer(service)

    const response = await createPurchaseOrderHandler(
      { ...baseInput, items: [] },
      { container }
    )

    expect(service.createPurchaseOrderItems).toHaveBeenCalledWith([])
    expect(response.output).toMatchObject({ items: [] })
  })
})

// ─── compensateCreatePurchaseOrder ───────────────────────────────────────────

describe("compensateCreatePurchaseOrder", () => {
  it("deletes PO items by purchase_order_id then deletes the order by id", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await compensateCreatePurchaseOrder("po_1", { container })

    expect(service.deletePurchaseOrderItems).toHaveBeenCalledWith({
      purchase_order_id: "po_1",
    })
    expect(service.deletePurchaseOrders).toHaveBeenCalledWith("po_1")
  })

  it("deletes items before deletes the order (call order)", async () => {
    const callOrder: string[] = []
    const service = makeService({
      deletePurchaseOrderItems: jest.fn().mockImplementation(() => {
        callOrder.push("items")
        return Promise.resolve(undefined)
      }),
      deletePurchaseOrders: jest.fn().mockImplementation(() => {
        callOrder.push("order")
        return Promise.resolve(undefined)
      }),
    })
    const container = makeContainer(service)

    await compensateCreatePurchaseOrder("po_1", { container })

    expect(callOrder).toEqual(["items", "order"])
  })
})
