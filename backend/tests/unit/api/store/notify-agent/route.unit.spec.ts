import { Modules } from "@medusajs/framework/utils"
import { POST, clearRateLimitForTesting } from "../../../../../src/api/store/notify-agent/route"
import { clearRecipientsCache } from "../../../../../src/lib/notification-recipients"

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
  logger = { warn: jest.fn() },
}: {
  body?: Record<string, unknown>
  orders?: OrderRecord[]
  users?: UserRecord[]
  createNotifications?: jest.Mock
  logger?: { warn: jest.Mock }
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
        if (key === "logger") {
          return logger
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
  clearRecipientsCache()
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

  it("returns { ok: true } when the feed provider is not configured", async () => {
    const res = makeRes()
    const logger = { warn: jest.fn() }

    await POST(
      makeReq({
        body: { order_id: "order_01" },
        orders: [makeOrder()],
        createNotifications: jest.fn().mockRejectedValue(
          new Error("Could not find a notification provider for channel: feed")
        ),
        logger,
      }),
      res
    )

    expect(res.json).toHaveBeenCalledWith({ ok: true })
    expect(logger.warn).toHaveBeenCalled()
  })
})

// ─── recipient resolution ─────────────────────────────────────────────────────

describe("recipient resolution", () => {
  it("broadcasts to 'system' as fallback when no CS users exist", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    await POST(
      makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], users: [], createNotifications }),
      makeRes()
    )
    expect(createNotifications).toHaveBeenCalledTimes(1)
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({ to: "system" }))
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

// ─── rate limiting ────────────────────────────────────────────────────────────

describe("rate limiting", () => {
  it("allows the first 3 requests for the same order_id", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const order = makeOrder({ id: "order_rl" })
    for (let i = 0; i < 3; i++) {
      const res = makeRes()
      await POST(makeReq({ body: { order_id: "order_rl" }, orders: [order], createNotifications }), res)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    }
  })

  it("returns 429 on the 4th request for the same order_id within the window", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const order = makeOrder({ id: "order_rl2" })
    // First 3 succeed
    for (let i = 0; i < 3; i++) {
      await POST(makeReq({ body: { order_id: "order_rl2" }, orders: [order], createNotifications }), makeRes())
    }
    // 4th should be rate-limited
    const res = makeRes()
    await POST(makeReq({ body: { order_id: "order_rl2" }, orders: [order], createNotifications }), res)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({ error: "Too many requests. Try again later." })
  })

  it("allows a new order_id after the previous one was rate-limited", async () => {
    const createNotifications = jest.fn().mockResolvedValue({})
    const orderA = makeOrder({ id: "order_a" })
    const orderB = makeOrder({ id: "order_b" })
    // Exhaust order_a
    for (let i = 0; i < 3; i++) {
      await POST(makeReq({ body: { order_id: "order_a" }, orders: [orderA], createNotifications }), makeRes())
    }
    // order_b should still succeed
    const res = makeRes()
    await POST(makeReq({ body: { order_id: "order_b" }, orders: [orderB], createNotifications }), res)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})

// ─── customer ownership check ─────────────────────────────────────────────────

describe("customer ownership check", () => {
  it("returns 403 when authenticated customer_id does not match order.customer_id", async () => {
    const order = { id: "order_03", display_id: 123, email: "other@test.com", customer_id: "cust_abc" }
    const req = makeReq({ body: { order_id: "order_03" }, orders: [order] }) as any
    // Set auth_context to a different customer
    req.auth_context = { actor_id: "cust_different" }
    const res = makeRes()
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" })
  })

  it("allows the request when customer_id matches order.customer_id", async () => {
    const order = { id: "order_04", display_id: 124, email: "owner@test.com", customer_id: "cust_owner" }
    const req = makeReq({ body: { order_id: "order_04" }, orders: [order] }) as any
    req.auth_context = { actor_id: "cust_owner" }
    const res = makeRes()
    await POST(req, res)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })

  it("allows the request when order has no customer_id (guest order)", async () => {
    const order = { id: "order_05", display_id: 125, email: "guest@test.com", customer_id: null }
    const req = makeReq({ body: { order_id: "order_05" }, orders: [order] }) as any
    req.auth_context = { actor_id: "cust_someone" }
    const res = makeRes()
    await POST(req, res)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})

// ─── non-feed error re-throw ──────────────────────────────────────────────────

describe("non-feed provider error handling", () => {
  it("rethrows errors unrelated to missing feed provider", async () => {
    const createNotifications = jest.fn().mockRejectedValue(new Error("Database connection failed"))
    const req = makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], createNotifications })
    const res = makeRes()
    await expect(POST(req, res)).rejects.toThrow("Database connection failed")
  })

  it("does NOT rethrow when the error message mentions missing feed provider", async () => {
    const logger = { warn: jest.fn() }
    const createNotifications = jest.fn().mockRejectedValue(
      new Error("Could not find a notification provider for channel: feed")
    )
    const req = makeReq({ body: { order_id: "order_01" }, orders: [makeOrder()], createNotifications, logger })
    const res = makeRes()
    await expect(POST(req, res)).resolves.not.toThrow()
    expect(logger.warn).toHaveBeenCalled()
  })
})
