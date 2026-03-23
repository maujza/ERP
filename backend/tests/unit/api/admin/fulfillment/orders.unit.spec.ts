import { GET } from "../../../../../src/api/admin/fulfillment/orders/route"

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
  records = [] as ReturnType<typeof makeRecord>[],
  count = 0,
  take,
  skip,
}: {
  records?: ReturnType<typeof makeRecord>[]
  count?: number
  take?: number
  skip?: number
} = {}) {
  const fulfillmentService = {
    listAndCountFulfillmentRecords: jest.fn().mockResolvedValue([records, count]),
  }

  return {
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === PURCHASE_DEPARTMENT_MODULE) return fulfillmentService
        throw new Error(`Unknown service: ${key}`)
      }),
    },
    queryConfig: {
      pagination: {
        take: take ?? undefined,
        skip: skip ?? undefined,
      },
    },
    _service: fulfillmentService,
  } as any
}

function makeRes() {
  return { json: jest.fn().mockReturnThis() } as any
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("GET /admin/fulfillment/orders", () => {
  it("returns fulfillments array and count", async () => {
    const records = [makeRecord(), makeRecord({ id: "fr_02", order_id: "order_02" })]
    const req = makeReq({ records, count: 2 })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        fulfillments: records,
        count: 2,
      })
    )
  })

  it("returns empty fulfillments array when no records exist", async () => {
    const req = makeReq({ records: [], count: 0 })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ fulfillments: [], count: 0 })
    )
  })

  it("uses default limit 50 and offset 0 when queryConfig pagination is absent", async () => {
    const service = {
      listAndCountFulfillmentRecords: jest.fn().mockResolvedValue([[], 0]),
    }
    const req = {
      scope: {
        resolve: jest.fn().mockReturnValue(service),
      },
      queryConfig: undefined,
    } as any
    const res = makeRes()

    await GET(req, res)

    expect(service.listAndCountFulfillmentRecords).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 50, skip: 0 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0 })
    )
  })

  it("respects pagination take and skip from queryConfig", async () => {
    const records = [makeRecord()]
    const req = makeReq({ records, count: 1, take: 10, skip: 20 })
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountFulfillmentRecords).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 10, skip: 20 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 })
    )
  })

  it("orders results by created_at DESC", async () => {
    const req = makeReq()
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountFulfillmentRecords).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ order: { created_at: "DESC" } })
    )
  })

  it("queries with empty filter object", async () => {
    const req = makeReq()
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountFulfillmentRecords).toHaveBeenCalledWith(
      {},
      expect.any(Object)
    )
  })

  it("includes limit and offset in the response envelope", async () => {
    const req = makeReq({ count: 0, take: 25, skip: 0 })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).toHaveProperty("limit")
    expect(payload).toHaveProperty("offset")
  })
})
