import { MedusaError } from "@medusajs/framework/utils"
import { receiveOrderHandler } from "../receive-purchase-order"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeOrder(
  status: string,
  items: Array<{ id: string; variant_id: string; quantity: number; received_quantity: number }>
) {
  return { id: "po_1", status, items }
}

function makePurchaseService(order: ReturnType<typeof makeOrder>) {
  return {
    retrievePurchaseOrder: jest.fn().mockResolvedValue(order),
    updatePurchaseOrders: jest.fn().mockResolvedValue({ ...order, status: "received" }),
    updatePurchaseOrderItems: jest.fn().mockResolvedValue({}),
  }
}

function makeInventoryService() {
  return { adjustInventory: jest.fn().mockResolvedValue({}) }
}

function makeQuery(inventoryItemIds: string[]) {
  return {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          id: "var_1",
          inventory_items: inventoryItemIds.map((id) => ({ id })),
        },
      ],
    }),
  }
}

function makeContainer(
  purchaseService: ReturnType<typeof makePurchaseService>,
  inventoryService: ReturnType<typeof makeInventoryService>,
  query: ReturnType<typeof makeQuery>
) {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return purchaseService
      if (key === "inventory") return inventoryService
      if (key === "query") return query
      return {}
    }),
  }
}

// ─── receive handler ─────────────────────────────────────────────────────────

describe("receiveOrderHandler", () => {
  it("marks submitted order as received and adjusts inventory", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 3, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const query = makeQuery(["inv_1"])
    const container = makeContainer(purchaseService, inventoryService, query)

    await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1" },
      { container }
    )

    expect(purchaseService.updatePurchaseOrderItems).toHaveBeenCalledWith({
      id: "poi_1",
      received_quantity: 3,
    })
    expect(inventoryService.adjustInventory).toHaveBeenCalledWith("inv_1", "sloc_1", 3)
    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith({
      id: "po_1",
      status: "received",
    })
  })

  it("also receives draft orders (no status restriction on draft)", async () => {
    const order = makeOrder("draft", [
      { id: "poi_1", variant_id: "var_1", quantity: 1, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const query = makeQuery([])
    const container = makeContainer(purchaseService, inventoryService, query)

    await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1" },
      { container }
    )

    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith({
      id: "po_1",
      status: "received",
    })
  })

  it("throws when order is already received", async () => {
    const order = makeOrder("received", [])
    const purchaseService = makePurchaseService(order)
    const container = makeContainer(
      purchaseService,
      makeInventoryService(),
      makeQuery([])
    )

    await expect(
      receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is cancelled", async () => {
    const order = makeOrder("cancelled", [])
    const purchaseService = makePurchaseService(order)
    const container = makeContainer(
      purchaseService,
      makeInventoryService(),
      makeQuery([])
    )

    await expect(
      receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("skips inventory adjustment when variant has no inventory items", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 2, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const query = makeQuery([]) // no inventory items linked
    const container = makeContainer(purchaseService, inventoryService, query)

    await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1" },
      { container }
    )

    expect(inventoryService.adjustInventory).not.toHaveBeenCalled()
    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith({
      id: "po_1",
      status: "received",
    })
  })

  it("stores adjustment records in compensation data for rollback", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 5, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const query = makeQuery(["inv_1", "inv_2"])
    const container = makeContainer(purchaseService, inventoryService, query)

    const response = await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1" },
      { container }
    )

    expect(response.compensateInput).toMatchObject({
      order_id: "po_1",
      previous_status: "submitted",
      adjustments: [
        { inventory_item_id: "inv_1", location_id: "sloc_1", quantity: 5 },
        { inventory_item_id: "inv_2", location_id: "sloc_1", quantity: 5 },
      ],
    })
  })
})
