jest.mock("../../../../../src/workflows/create-supplier", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import { GET, POST } from "../../../../../src/api/admin/purchase/suppliers/route"
import createSupplierWorkflow from "../../../../../src/workflows/create-supplier"

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

function makeSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "sup_01",
    name: "Acme Jewelry",
    email: "contact@acme.com",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeService({
  suppliers = [] as ReturnType<typeof makeSupplier>[],
  count = 0,
}: {
  suppliers?: ReturnType<typeof makeSupplier>[]
  count?: number
} = {}) {
  return {
    listAndCountSuppliers: jest.fn().mockResolvedValue([suppliers, count]),
  }
}

function makeGetReq({
  suppliers = [] as ReturnType<typeof makeSupplier>[],
  count = 0,
  take,
  skip,
}: {
  suppliers?: ReturnType<typeof makeSupplier>[]
  count?: number
  take?: number
  skip?: number
} = {}) {
  const service = makeService({ suppliers, count })
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

describe("GET /admin/purchase/suppliers", () => {
  it("returns suppliers array and count", async () => {
    const suppliers = [makeSupplier(), makeSupplier({ id: "sup_02" })]
    const req = makeGetReq({ suppliers, count: 2 })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ suppliers, count: 2 })
    )
  })

  it("returns empty array when no suppliers exist", async () => {
    const req = makeGetReq({ suppliers: [], count: 0 })
    const res = makeRes()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ suppliers: [], count: 0 })
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

    expect(service.listAndCountSuppliers).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 50, skip: 0 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, offset: 0 })
    )
  })

  it("respects take and skip from queryConfig pagination", async () => {
    const req = makeGetReq({ count: 3, take: 5, skip: 10 })
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountSuppliers).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 5, skip: 10 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10 })
    )
  })

  it("orders results by created_at DESC", async () => {
    const req = makeGetReq()
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listAndCountSuppliers).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ order: { created_at: "DESC" } })
    )
  })

  it("includes limit and offset in response envelope", async () => {
    const req = makeGetReq()
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).toHaveProperty("limit")
    expect(payload).toHaveProperty("offset")
  })
})

describe("POST /admin/purchase/suppliers", () => {
  it("runs createSupplierWorkflow with the validated body", async () => {
    const supplier = makeSupplier()
    const mockRun = jest.fn().mockResolvedValue({ result: supplier })
    ;(createSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const body = { name: "Acme Jewelry", email: "contact@acme.com", phone: "+54911111111" }
    const req = makePostReq(body)
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: body })
  })

  it("responds with status 201", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeSupplier() })
    ;(createSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ name: "New Supplier" })
    const res = makeRes()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("returns the workflow result wrapped in a supplier key", async () => {
    const supplier = makeSupplier()
    const mockRun = jest.fn().mockResolvedValue({ result: supplier })
    ;(createSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ name: "Acme Jewelry" })
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ supplier })
  })

  it("passes the scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeSupplier() })
    ;(createSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ name: "Test" })
    const res = makeRes()

    await POST(req, res)

    expect(createSupplierWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Validation failed"))
    ;(createSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ name: "" })
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Validation failed")
  })
})
