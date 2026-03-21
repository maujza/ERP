import orderPlacedHandler from "../../../src/subscribers/order-placed"
import { Modules } from "@medusajs/framework/utils"

// ─── helpers ─────────────────────────────────────────────────────────────────

type OrderRecord = {
  id?: string
  display_id?: number
  email?: string
  metadata?: Record<string, unknown>
}

type UserRecord = {
  id: string
  metadata?: Record<string, unknown>
}

function makeContainer({
  order = {},
  users = [] as UserRecord[],
}: {
  order?: OrderRecord
  users?: UserRecord[]
} = {}) {
  const createNotifications = jest.fn().mockResolvedValue({})

  const container = {
    resolve: jest.fn((key: string) => {
      if (key === "query") {
        return {
          graph: jest.fn(({ entity }: { entity: string }) => {
            if (entity === "order") return Promise.resolve({ data: [order] })
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
  }

  return { container, createNotifications }
}

function makeEvent(orderId = "order_01") {
  return { data: { id: orderId } }
}

async function run(container: ReturnType<typeof makeContainer>["container"], orderId = "order_01") {
  await orderPlacedHandler({
    event: makeEvent(orderId),
    container: container as any,
  } as any)
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("orderPlacedHandler", () => {
  describe("when order has whatsapp_required: true", () => {
    const waOrder: OrderRecord = {
      id: "order_01",
      display_id: 42,
      email: "cliente@test.com",
      metadata: {
        whatsapp_required: true,
        whatsapp_payment_method: "cash",
        customer_phone: "+54 9 11 1234-5678",
      },
    }

    it("calls createNotifications once when no CS users exist (fallback broadcast)", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      expect(createNotifications).toHaveBeenCalledTimes(1)
    })

    it("uses broadcast (to: '') as fallback when no CS users are found", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "" })
      )
    })

    it("calls createNotifications once per CS user when CS users exist", async () => {
      const csUsers: UserRecord[] = [
        { id: "user_cs_1", metadata: { notification_roles: ["customer_service"] } },
        { id: "user_cs_2", metadata: { role: "customer_service" } },
      ]
      const { container, createNotifications } = makeContainer({ order: waOrder, users: csUsers })
      await run(container)
      expect(createNotifications).toHaveBeenCalledTimes(2)
    })

    it("targets each CS user's id in 'to'", async () => {
      const csUsers: UserRecord[] = [
        { id: "user_cs_1", metadata: { notification_roles: ["customer_service"] } },
      ]
      const { container, createNotifications } = makeContainer({ order: waOrder, users: csUsers })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user_cs_1" })
      )
    })

    it("does NOT notify non-CS users", async () => {
      const users: UserRecord[] = [
        { id: "user_admin", metadata: { role: "admin" } },
        { id: "user_cs", metadata: { role: "customer_service" } },
      ]
      const { container, createNotifications } = makeContainer({ order: waOrder, users })
      await run(container)
      expect(createNotifications).toHaveBeenCalledTimes(1)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user_cs" })
      )
    })

    it("sends with channel: 'feed' and template: 'admin-ui'", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ channel: "feed", template: "admin-ui" })
      )
    })

    it("notification title is 'Nueva orden WhatsApp pendiente'", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "Nueva orden WhatsApp pendiente" }),
        })
      )
    })

    it("includes customer phone in description when present", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(call.data.description).toContain("+54 9 11 1234-5678")
    })

    it("includes order email in description", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(call.data.description).toContain("cliente@test.com")
    })

    it("includes payment method in description", async () => {
      const { container, createNotifications } = makeContainer({ order: waOrder, users: [] })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(call.data.description).toContain("cash")
    })

    it("description is valid when customer phone is absent", async () => {
      const orderNoPhone: OrderRecord = {
        ...waOrder,
        metadata: { whatsapp_required: true, whatsapp_payment_method: "transfer" },
      }
      const { container, createNotifications } = makeContainer({ order: orderNoPhone, users: [] })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(typeof call.data.description).toBe("string")
      expect(call.data.description.length).toBeGreaterThan(0)
    })

    it("matches CS users with notification_roles array (case-insensitive)", async () => {
      const users: UserRecord[] = [
        { id: "user_1", metadata: { notification_roles: ["CUSTOMER_SERVICE"] } },
      ]
      const { container, createNotifications } = makeContainer({ order: waOrder, users })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user_1" })
      )
    })

    it("matches CS users with role string (case-insensitive)", async () => {
      const users: UserRecord[] = [
        { id: "user_1", metadata: { role: "Customer_Service" } },
      ]
      const { container, createNotifications } = makeContainer({ order: waOrder, users })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user_1" })
      )
    })
  })

  describe("when order does NOT have whatsapp_required", () => {
    it("does not call createNotifications when metadata is absent", async () => {
      const order: OrderRecord = { id: "order_01", display_id: 1, email: "a@b.com" }
      const { container, createNotifications } = makeContainer({ order })
      await run(container)
      expect(createNotifications).not.toHaveBeenCalled()
    })

    it("does not call createNotifications when whatsapp_required is false", async () => {
      const order: OrderRecord = {
        id: "order_01",
        metadata: { whatsapp_required: false },
      }
      const { container, createNotifications } = makeContainer({ order })
      await run(container)
      expect(createNotifications).not.toHaveBeenCalled()
    })

    it("does not call createNotifications when metadata is empty object", async () => {
      const order: OrderRecord = { id: "order_01", metadata: {} }
      const { container, createNotifications } = makeContainer({ order })
      await run(container)
      expect(createNotifications).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("propagates errors thrown by query.graph", async () => {
      const container = {
        resolve: jest.fn(() => ({
          graph: jest.fn().mockRejectedValue(new Error("DB connection failed")),
        })),
      }
      await expect(run(container as any)).rejects.toThrow("DB connection failed")
    })
  })
})
