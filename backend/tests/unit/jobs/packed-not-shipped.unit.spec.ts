import packedNotShippedJob from "../../../src/jobs/packed-not-shipped"
import { Modules } from "@medusajs/framework/utils"

// ─── helpers ─────────────────────────────────────────────────────────────────

const HOURS_26_AGO = new Date(Date.now() - 26 * 60 * 60 * 1000)
const HOURS_1_AGO = new Date(Date.now() - 1 * 60 * 60 * 1000)
const HOURS_5_AGO = new Date(Date.now() - 5 * 60 * 60 * 1000)

function makeRecord(overrides: Partial<{
  id: string
  order_id: string
  status: string
  updated_at: Date
  last_notified_at: Date | null
}> = {}) {
  return {
    id: "fr_1",
    order_id: "order_1",
    status: "packed",
    updated_at: HOURS_26_AGO,
    last_notified_at: null,
    ...overrides,
  }
}

function makeContainer({
  records = [makeRecord()],
  users = [{ id: "inv_user", metadata: { role: "inventory" } }],
  queryError = false,
  notifyError = false,
  updateError = false,
}: {
  records?: any[]
  users?: any[]
  queryError?: boolean
  notifyError?: boolean
  updateError?: boolean
} = {}) {
  const createNotifications = jest.fn().mockImplementation(() =>
    notifyError ? Promise.reject(new Error("notify failed")) : Promise.resolve({})
  )
  const updateFulfillmentRecords = jest.fn().mockImplementation(() =>
    updateError ? Promise.reject(new Error("DB write failed")) : Promise.resolve({})
  )
  const logger = { warn: jest.fn() }

  const container = {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") {
        return {
          listFulfillmentRecords: queryError
            ? jest.fn().mockRejectedValue(new Error("DB error"))
            : jest.fn().mockResolvedValue(records),
          updateFulfillmentRecords,
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
    _updateFulfillmentRecords: updateFulfillmentRecords,
    _logger: logger,
  }
  return container
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("packedNotShippedJob", () => {
  it("sends notification for each qualifying order (packed >24h)", async () => {
    const { resolve, _createNotifications } = makeContainer({
      records: [makeRecord({ updated_at: HOURS_26_AGO })],
    }) as any
    await packedNotShippedJob({ resolve } as any)
    expect(_createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "inv_user",
        data: expect.objectContaining({ order_id: "order_1" }),
      })
    )
  })

  it("does NOT notify for orders packed less than 24h ago", async () => {
    const { resolve, _createNotifications } = makeContainer({
      records: [makeRecord({ updated_at: HOURS_1_AGO })],
    }) as any
    await packedNotShippedJob({ resolve } as any)
    expect(_createNotifications).not.toHaveBeenCalled()
  })

  it("does NOT re-notify within the 4-hour cooldown", async () => {
    const { resolve, _createNotifications } = makeContainer({
      records: [makeRecord({ updated_at: HOURS_26_AGO, last_notified_at: HOURS_1_AGO })],
    }) as any
    await packedNotShippedJob({ resolve } as any)
    expect(_createNotifications).not.toHaveBeenCalled()
  })

  it("re-notifies when last_notified_at is older than the cooldown", async () => {
    const { resolve, _createNotifications } = makeContainer({
      records: [makeRecord({ updated_at: HOURS_26_AGO, last_notified_at: HOURS_5_AGO })],
    }) as any
    await packedNotShippedJob({ resolve } as any)
    expect(_createNotifications).toHaveBeenCalled()
  })

  it("does nothing when there are no qualifying packed orders", async () => {
    const { resolve, _createNotifications } = makeContainer({ records: [] }) as any
    await packedNotShippedJob({ resolve } as any)
    expect(_createNotifications).not.toHaveBeenCalled()
  })

  it("logs warning and does NOT throw when DB query fails", async () => {
    const { resolve, _logger } = makeContainer({ queryError: true }) as any
    await expect(packedNotShippedJob({ resolve } as any)).resolves.toBeUndefined()
    expect(_logger.warn).toHaveBeenCalled()
  })

  it("logs warning and continues when notification fails for one order", async () => {
    const { resolve, _logger, _createNotifications } = makeContainer({
      records: [makeRecord({ updated_at: HOURS_26_AGO })],
      notifyError: true,
    }) as any
    await expect(packedNotShippedJob({ resolve } as any)).resolves.toBeUndefined()
    expect(_logger.warn).toHaveBeenCalled()
  })

  it("logs warning but does NOT re-throw when last_notified_at write fails", async () => {
    const { resolve, _logger, _createNotifications } = makeContainer({
      records: [makeRecord({ updated_at: HOURS_26_AGO })],
      updateError: true,
    }) as any
    await expect(packedNotShippedJob({ resolve } as any)).resolves.toBeUndefined()
    expect(_createNotifications).toHaveBeenCalled() // notify still fired
    expect(_logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("last_notified_at write failed"),
      expect.any(Object)
    )
  })
})
