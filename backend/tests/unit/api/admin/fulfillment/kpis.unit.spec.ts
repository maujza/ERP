import { GET } from "../../../../../src/api/admin/fulfillment/kpis/route"

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

type FulfillmentRecord = {
  id: string
  order_id: string
  status: string
  created_at: string | Date
  updated_at: string | Date
}

function makeRecord(overrides: Partial<FulfillmentRecord> = {}): FulfillmentRecord {
  const now = new Date().toISOString()
  return {
    id: "fr_01",
    order_id: "order_01",
    status: "dispatched",
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

function makeReq({
  dispatched = [] as FulfillmentRecord[],
  picking = [] as FulfillmentRecord[],
}: {
  dispatched?: FulfillmentRecord[]
  picking?: FulfillmentRecord[]
} = {}) {
  const listFulfillmentRecords = jest.fn().mockImplementation(
    ({ status }: { status: string }) => {
      if (status === "dispatched") return Promise.resolve(dispatched)
      if (status === "picking") return Promise.resolve(picking)
      return Promise.resolve([])
    }
  )

  return {
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === PURCHASE_DEPARTMENT_MODULE) {
          return { listFulfillmentRecords }
        }
        throw new Error(`Unknown service: ${key}`)
      }),
    },
  } as any
}

function makeRes() {
  const res = { json: jest.fn().mockReturnThis() }
  return res as any
}

// ─── time helpers ─────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("GET /admin/fulfillment/kpis", () => {
  describe("avg_lead_time_minutes", () => {
    it("returns avg_lead_time_minutes as a number computed from dispatched records within 30-day window", async () => {
      // Lead time = updatedAt - createdAt, expressed in minutes
      const createdAt = daysAgo(5)
      const updatedAt = new Date(createdAt.getTime() + 120 * 60 * 1000) // 120 min lead time

      const dispatched = [makeRecord({ created_at: createdAt, updated_at: updatedAt })]
      const res = makeRes()
      await GET(makeReq({ dispatched }), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ avg_lead_time_minutes: 120 })
      )
    })

    it("returns avg_lead_time_minutes: null when no dispatched records exist in the window", async () => {
      const res = makeRes()
      await GET(makeReq({ dispatched: [] }), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ avg_lead_time_minutes: null })
      )
    })

    it("excludes dispatched records older than 30 days from the average", async () => {
      // Record outside the 30-day window — should be excluded
      const oldCreatedAt = daysAgo(31)
      const oldUpdatedAt = new Date(oldCreatedAt.getTime() + 60 * 60 * 1000) // 60 min lead time

      // Record within the 30-day window
      const recentCreatedAt = daysAgo(5)
      const recentUpdatedAt = new Date(recentCreatedAt.getTime() + 240 * 60 * 1000) // 240 min lead time

      const dispatched = [
        makeRecord({ id: "fr_old", created_at: oldCreatedAt, updated_at: oldUpdatedAt }),
        makeRecord({ id: "fr_new", created_at: recentCreatedAt, updated_at: recentUpdatedAt }),
      ]

      const res = makeRes()
      await GET(makeReq({ dispatched }), res)

      // Only the recent record (240 min) should factor into the average
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ avg_lead_time_minutes: 240 })
      )
    })
  })

  describe("stuck_in_picking_count", () => {
    it("returns correct stuck_in_picking_count for picking records older than 24h", async () => {
      const stuckRecord = makeRecord({
        id: "fr_stuck",
        order_id: "order_stuck",
        status: "picking",
        updated_at: hoursAgo(25), // 25h ago — beyond the 24h threshold
      })
      const recentRecord = makeRecord({
        id: "fr_fresh",
        order_id: "order_fresh",
        status: "picking",
        updated_at: hoursAgo(1), // 1h ago — within threshold
      })

      const res = makeRes()
      await GET(makeReq({ picking: [stuckRecord, recentRecord] }), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stuck_in_picking_count: 1 })
      )
    })

    it("returns 0 stuck_in_picking_count when all picking records are recent", async () => {
      const recentRecords = [
        makeRecord({ id: "fr_a", status: "picking", updated_at: hoursAgo(2) }),
        makeRecord({ id: "fr_b", status: "picking", updated_at: hoursAgo(12) }),
        makeRecord({ id: "fr_c", status: "picking", updated_at: hoursAgo(23) }),
      ]

      const res = makeRes()
      await GET(makeReq({ picking: recentRecords }), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stuck_in_picking_count: 0 })
      )
    })
  })

  describe("dispatched_count_30d", () => {
    it("returns correct dispatched_count_30d reflecting only records within the 30-day window", async () => {
      const inWindow = [
        makeRecord({ id: "fr_1", created_at: daysAgo(1), updated_at: daysAgo(1) }),
        makeRecord({ id: "fr_2", created_at: daysAgo(15), updated_at: daysAgo(15) }),
        makeRecord({ id: "fr_3", created_at: daysAgo(29), updated_at: daysAgo(29) }),
      ]
      const outOfWindow = [
        makeRecord({ id: "fr_old", created_at: daysAgo(31), updated_at: daysAgo(31) }),
      ]

      const res = makeRes()
      await GET(makeReq({ dispatched: [...inWindow, ...outOfWindow] }), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ dispatched_count_30d: 3 })
      )
    })
  })

  describe("response shape", () => {
    it("includes all expected fields: avg_lead_time_minutes, stuck_in_picking_count, dispatched_count_30d", async () => {
      const res = makeRes()
      await GET(makeReq(), res)

      const payload = res.json.mock.calls[0][0]
      expect(payload).toHaveProperty("avg_lead_time_minutes")
      expect(payload).toHaveProperty("stuck_in_picking_count")
      expect(payload).toHaveProperty("dispatched_count_30d")
    })
  })
})
