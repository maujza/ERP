import { lowStockCheckHandler } from "../../../src/subscribers/low-stock-check"
import { Modules } from "@medusajs/framework/utils"

// ─── helpers ─────────────────────────────────────────────────────────────────

const THRESHOLD = 5

function makeContainer({
  stockedQuantity = 0,
  users = [] as { id: string; metadata?: any }[],
  inventoryError = false,
  notifyError = false,
}: {
  stockedQuantity?: number
  users?: { id: string; metadata?: any }[]
  inventoryError?: boolean
  notifyError?: boolean
} = {}) {
  const createNotifications = jest.fn().mockImplementation(() =>
    notifyError ? Promise.reject(new Error("Notify failed")) : Promise.resolve({})
  )
  const logger = { warn: jest.fn() }

  return {
    resolve: jest.fn((key: string) => {
      if (key === Modules.INVENTORY) {
        return {
          listInventoryLevels: inventoryError
            ? jest.fn().mockRejectedValue(new Error("DB error"))
            : jest.fn().mockResolvedValue(
                stockedQuantity !== undefined
                  ? [
                      {
                        inventory_item_id: "inv_1",
                        location_id: "sloc_1",
                        stocked_quantity: stockedQuantity,
                      },
                    ]
                  : []
              ),
        }
      }
      if (key === "query") {
        return {
          graph: jest.fn().mockResolvedValue({ data: users }),
        }
      }
      if (key === Modules.NOTIFICATION) {
        return { createNotifications }
      }
      if (key === "logger") return logger
      return {}
    }),
    _createNotifications: createNotifications,
    _logger: logger,
  }
}

function makeEvent(data: { inventory_item_id: string; location_id: string }) {
  return { event: { data }, container: null as any }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("lowStockCheckHandler", () => {
  beforeEach(() => {
    // Reset the env threshold to default for each test
    delete process.env.LOW_STOCK_THRESHOLD
  })

  it("sends notification when stock is at or below threshold", async () => {
    const { resolve, _createNotifications } = makeContainer({
      stockedQuantity: THRESHOLD,
      users: [{ id: "user_1", metadata: { role: "purchasing" } }],
    }) as any
    await lowStockCheckHandler({ event: { data: { inventory_item_id: "inv_1", location_id: "sloc_1" } }, container: { resolve } } as any)
    expect(_createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user_1",
        data: expect.objectContaining({ inventory_item_id: "inv_1" }),
      })
    )
  })

  it("sends notification to inventory role users", async () => {
    const { resolve, _createNotifications } = makeContainer({
      stockedQuantity: 3,
      users: [
        { id: "inv_user", metadata: { role: "inventory" } },
        { id: "mkt_user", metadata: { role: "marketing" } },
      ],
    }) as any
    await lowStockCheckHandler({ event: { data: { inventory_item_id: "inv_1", location_id: "sloc_1" } }, container: { resolve } } as any)
    expect(_createNotifications).toHaveBeenCalledTimes(1)
    expect(_createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ to: "inv_user" })
    )
  })

  it("does NOT send notification when stock is above threshold", async () => {
    const { resolve, _createNotifications } = makeContainer({
      stockedQuantity: THRESHOLD + 1,
      users: [{ id: "user_1", metadata: { role: "purchasing" } }],
    }) as any
    await lowStockCheckHandler({ event: { data: { inventory_item_id: "inv_1", location_id: "sloc_1" } }, container: { resolve } } as any)
    expect(_createNotifications).not.toHaveBeenCalled()
  })

  it("logs warning and does NOT throw when inventory query fails", async () => {
    const { resolve, _logger } = makeContainer({ inventoryError: true }) as any
    await expect(
      lowStockCheckHandler({ event: { data: { inventory_item_id: "inv_1", location_id: "sloc_1" } }, container: { resolve } } as any)
    ).resolves.toBeUndefined()
    expect(_logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("low-stock-check"),
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  it("logs warning and does NOT throw when notification module fails", async () => {
    const { resolve, _logger } = makeContainer({
      stockedQuantity: 2,
      users: [{ id: "user_1", metadata: { role: "inventory" } }],
      notifyError: true,
    }) as any
    await expect(
      lowStockCheckHandler({ event: { data: { inventory_item_id: "inv_1", location_id: "sloc_1" } }, container: { resolve } } as any)
    ).resolves.toBeUndefined()
    expect(_logger.warn).toHaveBeenCalled()
  })
})
