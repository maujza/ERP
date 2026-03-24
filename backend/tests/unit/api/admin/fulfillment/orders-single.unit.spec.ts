import { MedusaError } from "@medusajs/framework/utils"
import { GET } from "../../../../../src/api/admin/fulfillment/orders/[id]/route"

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "fr_01",
    order_id: "order_01",
    status: "picking",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeReq({
  orderId = "order_01",
  record = makeRecord() as ReturnType<typeof makeRecord> | null,
}: {
  orderId?: string
  record?: ReturnType<typeof makeRecord> | null
} = {}) {
  const fulfillmentService = {
    listFulfillmentRecords: jest.fn().mockResolvedValue(record ? [record] : []),
  }

  return {
    params: { id: orderId },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === PURCHASE_DEPARTMENT_MODULE) return fulfillmentService
        throw new Error(`Unknown service: ${key}`)
      }),
    },
    _service: fulfillmentService,
  } as any
}

function makeRes() {
  return { json: jest.fn().mockReturnThis() } as any
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("GET /admin/fulfillment/orders/:id", () => {
  it("returns the fulfillment record for the given order id", async () => {
    const record = makeRecord({ status: "packed" })
    const req = makeReq({ orderId: "order_01", record })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith({ fulfillment: record })
  })

  it("queries listFulfillmentRecords with the order_id from params", async () => {
    const req = makeReq({ orderId: "order_42" })
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listFulfillmentRecords).toHaveBeenCalledWith({
      order_id: "order_42",
    })
  })

  it("throws NOT_FOUND when no record exists for the given order id", async () => {
    const req = makeReq({ orderId: "order_missing", record: null })
    const res = makeRes()

    await expect(GET(req, res)).rejects.toThrow(MedusaError)
  })

  it("NOT_FOUND error message references the order id", async () => {
    const req = makeReq({ orderId: "order_xyz", record: null })
    const res = makeRes()

    await expect(GET(req, res)).rejects.toThrow(/order_xyz/)
  })

  it("returns the record wrapped in a fulfillment key", async () => {
    const record = makeRecord()
    const req = makeReq({ record })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).toHaveProperty("fulfillment")
    expect(payload.fulfillment).toEqual(record)
  })
})
