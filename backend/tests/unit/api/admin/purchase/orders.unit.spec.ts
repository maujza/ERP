jest.mock("../../../../../src/workflows/create-purchase-order", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import { GET, POST } from "../../../../../src/api/admin/purchase/orders/route"
import createPurchaseOrderWorkflow from "../../../../../src/workflows/create-purchase-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po_01",
    supplier_id: "sup_01",
    status: "draft",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeService({
  orders = [] as ReturnType<typeof makeOrder>[],
  count = 0,
}: {
  orders?: ReturnType<typeof makeOrder>[]
  count?: number
} = {}) {
  return {
    listAndCountPurchaseOrders: jest.fn().mockResolvedValue([orders, count]),
  }
}

function makeGetReq({
  orders = [] as ReturnType<typeof makeOrder>[],
  count = 0,
  take,
  skip,
}: {
  orders?: ReturnType<typeof makeOrder>[]
  count?: number
  take?: number
  skip?: number
} = {}) {
  const service = makeService({ orders, count })
  return {
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === PURCHASE_DEPARTMENT_MODULE) return service
        throw new Error(`Unknown service: ${key}`)
      }),
    },
    queryConfig: { pagination: { take, skip } },
    _service: service,
  } as any
}

function makePostReq(body: Record<string, unknown> = {}) {
  return {
    validatedBody: body,
    scope: Symbol("scope") as any,
  } as any
}

function makeRes() {
  return {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  } as any
}

// ─── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

describe("GET /admin/purchase/orders", () => {
  it("returns orders array and count", async () => {
    const orders = [makeOrder(), makeOrder({ id: "po_02" })]
    const req = makeGetReq({ orders, count: 2 })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ orders, count: 2 })
    )
  })

  it("returns empty array when no orders exist", async () => {
    const req = makeGetReq({ orders: [], count: 0 })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ orders: [], count: 0 })
    )
  })

  it("uses default limit 50 and offset 0 when pagination is absent", async () => {
    const service = makeService()
    const req = {
      scope: { resolve: jest.fn().mockReturnValue(service) },
      queryConfig: undefined,
    } as any
    const res = makeRes()

    await GET(req, res)

    expect(service.listAndCountPurchaseOrders).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 50, skip: 0 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0 })
    )
  })

  it("respects take and skip from queryConfig pagination", async () => {
    const req = makeGetReq({ count: 5, take: 10, skip: 20 })
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountPurchaseOrders).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 10, skip: 20 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 })
    )
  })

  it("orders results by created_at DESC", async () => {
    const req = makeGetReq()
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountPurchaseOrders).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ order: { created_at: "DESC" } })
    )
  })
})

describe("POST /admin/purchase/orders", () => {
  it("runs createPurchaseOrderWorkflow with the validated body", async () => {
    const order = makeOrder()
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(createPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const body = { supplier_id: "sup_01", items: [{ variant_id: "var_01", quantity: 5 }] }
    const req = makePostReq(body)
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: body })
  })

  it("responds with status 201", async () => {
    const order = makeOrder()
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(createPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ supplier_id: "sup_01", items: [] })
    const res = makeRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("returns the workflow result directly (not nested)", async () => {
    const order = makeOrder()
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(createPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ supplier_id: "sup_01", items: [] })
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith(order)
  })

  it("passes the scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder() })
    ;(createPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ supplier_id: "sup_01", items: [] })
    const res = makeRes()

    await POST(req, res)

    expect(createPurchaseOrderWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Supplier not found"))
    ;(createPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ supplier_id: "invalid", items: [] })
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Supplier not found")
  })
})
