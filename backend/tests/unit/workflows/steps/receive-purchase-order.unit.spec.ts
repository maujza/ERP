import { MedusaError } from "@medusajs/framework/utils"
import { receiveOrderHandler } from "../../../../src/workflows/steps/receive-purchase-order"

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
    createStockAdjustmentLogs: jest.fn().mockResolvedValue([{ id: "log_1" }]),
    deleteStockAdjustmentLogs: jest.fn().mockResolvedValue(undefined),
  }
}

function makeInventoryService() {
  return { adjustInventory: jest.fn().mockResolvedValue({}) }
}

// Returns inventory_item_id (not link record id) as per the correct field name
function makeQuery(inventoryItemIds: string[]) {
  return {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          id: "var_1",
          inventory_items: inventoryItemIds.map((id) => ({ inventory_item_id: id })),
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

// ─── status guard ────────────────────────────────────────────────────────────

describe("receiveOrderHandler — status guard", () => {
  it("accepts submitted orders", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 3, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const container = makeContainer(purchaseService, makeInventoryService(), makeQuery(["inv_1"]))

    await receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })

    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: "received" })
    )
  })

  it("throws for draft orders (not yet submitted)", async () => {
    const order = makeOrder("draft", [])
    const container = makeContainer(makePurchaseService(order), makeInventoryService(), makeQuery([]))

    await expect(
      receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })
    ).rejects.toThrow(/must be submitted/i)
  })

  it("throws when order is already received", async () => {
    const order = makeOrder("received", [])
    const container = makeContainer(makePurchaseService(order), makeInventoryService(), makeQuery([]))

    await expect(
      receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is cancelled", async () => {
    const order = makeOrder("cancelled", [])
    const container = makeContainer(makePurchaseService(order), makeInventoryService(), makeQuery([]))

    await expect(
      receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })
    ).rejects.toThrow(MedusaError)
  })
})

// ─── inventory adjustment ────────────────────────────────────────────────────

describe("receiveOrderHandler — inventory adjustment", () => {
  it("adjusts inventory using inventory_item_id (not link record id)", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 3, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const query = makeQuery(["inv_1"])
    const container = makeContainer(purchaseService, inventoryService, query)

    await receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })

    expect(inventoryService.adjustInventory).toHaveBeenCalledWith("inv_1", "sloc_1", 3)
  })

  it("uses per-item received quantity when override is provided", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 10, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const container = makeContainer(purchaseService, inventoryService, makeQuery(["inv_1"]))

    await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1", items: [{ id: "poi_1", received_quantity: 7 }] },
      { container }
    )

    expect(inventoryService.adjustInventory).toHaveBeenCalledWith("inv_1", "sloc_1", 7)
    expect(purchaseService.updatePurchaseOrderItems).toHaveBeenCalledWith({
      id: "poi_1",
      received_quantity: 7,
    })
  })

  it("skips inventory adjustment when variant has no inventory items", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 2, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const inventoryService = makeInventoryService()
    const query = makeQuery([])
    const container = makeContainer(purchaseService, inventoryService, query)

    await receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })

    expect(inventoryService.adjustInventory).not.toHaveBeenCalled()
    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: "received" })
    )
  })

  it("stores adjustment records in compensation data for rollback", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 5, received_quantity: 0 },
    ])
    const container = makeContainer(
      makePurchaseService(order),
      makeInventoryService(),
      makeQuery(["inv_1", "inv_2"])
    )

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

// ─── StockAdjustmentLog ──────────────────────────────────────────────────────

describe("receiveOrderHandler — StockAdjustmentLog", () => {
  it("inserts a StockAdjustmentLog with reason_code=po_receive for each adjusted item", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 5, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const container = makeContainer(purchaseService, makeInventoryService(), makeQuery(["inv_1"]))

    await receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })

    expect(purchaseService.createStockAdjustmentLogs).toHaveBeenCalledWith([
      expect.objectContaining({
        variant_id: "var_1",
        location_id: "sloc_1",
        delta: 5,
        reason_code: "po_receive",
        purchase_order_id: "po_1",
      }),
    ])
  })

  it("records log ids in compensation data so they can be rolled back", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 3, received_quantity: 0 },
    ])
    const container = makeContainer(
      makePurchaseService(order),
      makeInventoryService(),
      makeQuery(["inv_1"])
    )

    const response = await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1" },
      { container }
    )

    expect(response.compensateInput).toMatchObject({ log_ids: ["log_1"] })
  })

  it("log insert failure causes step to throw (triggering compensation)", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 5, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    purchaseService.createStockAdjustmentLogs = jest
      .fn()
      .mockRejectedValue(new Error("DB constraint violation"))
    const container = makeContainer(purchaseService, makeInventoryService(), makeQuery(["inv_1"]))

    await expect(
      receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })
    ).rejects.toThrow("DB constraint violation")
  })
})

// ─── discrepancy flag ─────────────────────────────────────────────────────────

describe("receiveOrderHandler — discrepancy flag", () => {
  it("sets discrepancy_count=0 when all items fully received", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 5, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const container = makeContainer(purchaseService, makeInventoryService(), makeQuery(["inv_1"]))

    await receiveOrderHandler({ order_id: "po_1", location_id: "sloc_1" }, { container })

    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ discrepancy_count: 0 })
    )
  })

  it("sets discrepancy_count>0 when any item is partially received", async () => {
    const order = makeOrder("submitted", [
      { id: "poi_1", variant_id: "var_1", quantity: 10, received_quantity: 0 },
    ])
    const purchaseService = makePurchaseService(order)
    const container = makeContainer(purchaseService, makeInventoryService(), makeQuery(["inv_1"]))

    await receiveOrderHandler(
      { order_id: "po_1", location_id: "sloc_1", items: [{ id: "poi_1", received_quantity: 7 }] },
      { container }
    )

    expect(purchaseService.updatePurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ discrepancy_count: 1 })
    )
  })
})
