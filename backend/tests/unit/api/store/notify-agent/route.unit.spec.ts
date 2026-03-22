import { Modules } from "@medusajs/framework/utils"
import { POST, clearRateLimitForTesting } from "../../../../../src/api/store/notify-agent/route"

// ─── helpers ─────────────────────────────────────────────────────────────────

type OrderRecord = { id: string; display_id?: number; email?: string }
type UserRecord = { id: string; metadata?: Record<string, unknown> }

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return { id: "order_01", display_id: 42, email: "cliente@test.com", ...overrides }
}

function makeUser(id: string, metadata?: Record<string, unknown>): UserRecord {
  return { id, metadata }
}

function makeReq({
  body = {} as Record<string, unknown>,
  orders = [] as OrderRecord[],
  users = [] as UserRecord[],
  createNotifications = jest.fn().mockResolvedValue({}),
}: {
  body?: Record<string, unknown>
  orders?: OrderRecord[]
  users?: UserRecord[]
  createNotifications?: jest.Mock
} = {}) {
  return {
    body,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "query") {
          return {
            graph: jest.fn(({ entity }: { entity: string }) => {
              if (entity === "order") return Promise.resolve({ data: orders })
              if (entity === "user") return Promise.resolve({ data: users })
              return Promise.resolve({ data: [] })
            }),
          }
        }
        if (key === Modules.NOTIFICATION) {
          return { createNotifications }
        }
        throw new Error(`Unknown service: ${key}`)
      }),
    },
  } as any
}

function makeRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }
  return res as any
}

beforeEach(() => {
  clearRateLimitForTesting()
})

// ─── validation ───────────────────────────────────────────────────────────────

describe("validation", () => {
  it("returns 400 when order_id is missing from the body", async () => {
    const res = makeRes()
    await POST(makeReq({ body: {} }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: "order_id is required" })
  })

  it("returns 400 when order_id is explicitly undefined", async () => {
    const res = makeRes()
    await POST(makeReq({ body: { order_id: undefined } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("returns 404 when no order is found for the given id", async () => {
    const res = makeRes()
    await POST(makeReq({ body: { order_id: "order_missing" }, orders: [] }), res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: "Order not found" })
  })
})

// ─── success response ────────────────────────────────────────────────────────

describe("successful notification", () => {
  it("returns { ok: true } on success", async () => {
    const res = makeRes()
    await POST(makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()] }), res)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})

// ─── recipient resolution ─────────────────────────────────────────────────────

describe("recipient resolution", () => {
  it("broadcasts (to: '') as fallback when no CS users exist", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users: [], createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "" }))
  })

  it("sends one notification per CS user", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const users = [
      makeUser("cs_1", { role: "customer_service" }),
      makeUser("cs_2", { role: "customer_service" }),
    ]
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users, createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledTimes(2)
  })

  it("targets each CS user's id in 'to'", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const users = [makeUser("cs_only", { role: "customer_service" })]
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users, createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "cs_only" }))
  })

  it("does not notify non-CS users", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const users = [
      makeUser("admin_1", { role: "admin" }),
      makeUser("cs_1", { role: "customer_service" }),
    ]
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users, createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "cs_1" }))
  })

  it("matches CS role case-insensitively via role string (uppercase)", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const users = [makeUser("cs_upper", { role: "CUSTOMER_SERVICE" })]
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users, createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "cs_upper" }))
  })

  it("matches CS role case-insensitively via role string", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const users = [makeUser("cs_mixed", { role: "Customer_Service" })]
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users, createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "cs_mixed" }))
  })
})

// ─── notification payload ─────────────────────────────────────────────────────

describe("notification payload", () => {
  it("uses channel 'feed' and template 'admin-ui'", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users: [], createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "feed", template: "admin-ui" })
    )
  })

  it("sets resource_id to the order id", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder({ id: "order_01" })], users: [], createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: "order_01" })
    )
  })

  it("sets resource_type to 'order'", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users: [], createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ resource_type: "order" })
    )
  })

  it("includes the order display_id in the description", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder({ display_id: 99 })], users: [], createNotifications }),
      makeRes()
    )
    const notification = createNotifications.mock.calls[0][0]
    expect(notification.data.description).toContain("99")
  })

  it("includes the order email in the description", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder({ email: "buyer@test.com" })], users: [], createNotifications }),
      makeRes()
    )
    const notification = createNotifications.mock.calls[0][0]
    expect(notification.data.description).toContain("buyer@test.com")
  })

  it("uses the order id as fallback when display_id is absent", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder({ display_id: undefined })], users: [], createNotifications }),
      makeRes()
    )
    const notification = createNotifications.mock.calls[0][0]
    expect(notification.data.description).toContain("order_01")
  })

  it("uses em-dash as fallback when email is absent", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder({ email: undefined })], users: [], createNotifications }),
      makeRes()
    )
    const notification = createNotifications.mock.calls[0][0]
    expect(notification.data.description).toContain("—")
  })

  it("data.title is a non-empty string", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users: [], createNotifications }),
      makeRes()
    )
    const notification = createNotifications.mock.calls[0][0]
    expect(typeof notification.data.title).toBe("string")
    expect(notification.data.title.length).toBeGreaterThan(0)
  })
})
