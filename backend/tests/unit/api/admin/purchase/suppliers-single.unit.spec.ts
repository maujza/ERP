jest.mock("../../../../../src/workflows/update-supplier", () => ({
  updateSupplierWorkflow: jest.fn(),
  deleteSupplierWorkflow: jest.fn(),
}))

import { MedusaError } from "@medusajs/framework/utils"
import { GET, POST, DELETE } from "../../../../../src/api/admin/purchase/suppliers/[id]/route"
import * as updateSupplierModule from "../../../../../src/workflows/update-supplier"

// ─── helpers ──────────────────────────────────────────────────────────────────

const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

function makeSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "sup_01",
    name: "Acme Jewelry",
    email: "contact@acme.com",
    fill_rate: 0.95,
    ...overrides,
  }
}

function makeService({
  supplier = makeSupplier() as ReturnType<typeof makeSupplier> | null,
  orders = [] as Record<string, unknown>[],
  items = [] as Record<string, unknown>[],
}: {
  supplier?: ReturnType<typeof makeSupplier> | null
  orders?: Record<string, unknown>[]
  items?: Record<string, unknown>[]
} = {}) {
  return {
    retrieveSupplier: supplier
      ? jest.fn().mockResolvedValue(supplier)
      : jest.fn().mockRejectedValue(new Error("Not found")),
    listPurchaseOrders: jest.fn().mockResolvedValue(orders),
    listPurchaseOrderItems: jest.fn().mockResolvedValue(items),
  }
}

function makeGetReq({
  supplierId = "sup_01",
  supplier = makeSupplier() as ReturnType<typeof makeSupplier> | null,
  include_meta = "false",
  orders = [] as Record<string, unknown>[],
  items = [] as Record<string, unknown>[],
}: {
  supplierId?: string
  supplier?: ReturnType<typeof makeSupplier> | null
  include_meta?: string
  orders?: Record<string, unknown>[]
  items?: Record<string, unknown>[]
} = {}) {
  const service = makeService({ supplier, orders, items })
  return {
    params: { id: supplierId },
    query: { include_meta },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === PURCHASE_DEPARTMENT_MODULE) return service
        throw new Error(`Unknown service: ${key}`)
      }),
    },
    _service: service,
  } as any
}

function makePostReq({
  supplierId = "sup_01",
  body = {} as Record<string, unknown>,
}: {
  supplierId?: string
  body?: Record<string, unknown>
} = {}) {
  return {
    params: { id: supplierId },
    validatedBody: body,
    scope: Symbol("scope") as any,
  } as any
}

function makeDeleteReq({ supplierId = "sup_01" }: { supplierId?: string } = {}) {
  return {
    params: { id: supplierId },
    scope: Symbol("scope") as any,
  } as any
}

function makeRes() {
  return { json: jest.fn().mockReturnThis() } as any
}

// ─── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET ──────────────────────────────────────────────────────────────────────

describe("GET /admin/purchase/suppliers/:id", () => {
  it("returns the supplier and its cached fill_rate", async () => {
    const supplier = makeSupplier({ fill_rate: 0.92 })
    const req = makeGetReq({ supplier })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).toHaveProperty("supplier")
    expect(payload).toHaveProperty("fill_rate", 0.92)
  })

  it("returns null fill_rate when supplier.fill_rate is not set", async () => {
    const supplier = makeSupplier({ fill_rate: null })
    const req = makeGetReq({ supplier })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload.fill_rate).toBeNull()
  })

  it("throws NOT_FOUND when supplier does not exist", async () => {
    const req = makeGetReq({ supplier: null })
    const res = makeRes()

    await expect(GET(req, res)).rejects.toThrow(MedusaError)
  })

  it("does NOT include fill_rate_meta when include_meta is false", async () => {
    const req = makeGetReq({ include_meta: "false" })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).not.toHaveProperty("fill_rate_meta")
  })

  it("includes fill_rate_meta when include_meta=true", async () => {
    const supplier = makeSupplier()
    const orders = [{ id: "po_01", status: "received" }]
    const items = [
      { quantity: 10, received_quantity: 9 },
      { quantity: 5, received_quantity: 5 },
    ]
    const req = makeGetReq({ supplier, include_meta: "true", orders, items })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload).toHaveProperty("fill_rate_meta")
    expect(payload.fill_rate_meta).toMatchObject({
      total_ordered: 15,
      total_received: 14,
      po_count: 1,
    })
  })

  it("fill_rate_meta totals are 0 when no received POs exist", async () => {
    const req = makeGetReq({ include_meta: "true", orders: [], items: [] })
    const res = makeRes()

    await GET(req, res)

    const payload = res.json.mock.calls[0][0]
    expect(payload.fill_rate_meta).toMatchObject({
      total_ordered: 0,
      total_received: 0,
      po_count: 0,
    })
  })

  it("does not query PO items when include_meta is false", async () => {
    const req = makeGetReq({ include_meta: "false" })
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listPurchaseOrders).not.toHaveBeenCalled()
    expect(req._service.listPurchaseOrderItems).not.toHaveBeenCalled()
  })

  it("filters POs by supplier_id and received status when include_meta=true", async () => {
    const req = makeGetReq({ supplierId: "sup_42", include_meta: "true" })
    const res = makeRes()

    await GET(req, res)

    expect(req._service.listPurchaseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ supplier_id: "sup_42", status: "received" })
    )
  })
})

// ─── POST (update) ────────────────────────────────────────────────────────────

describe("POST /admin/purchase/suppliers/:id", () => {
  it("runs updateSupplierWorkflow with id merged into the body", async () => {
    const supplier = makeSupplier({ name: "Updated Name" })
    const mockRun = jest.fn().mockResolvedValue({ result: supplier })
    ;(updateSupplierModule.updateSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ supplierId: "sup_01", body: { name: "Updated Name" } })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: { id: "sup_01", name: "Updated Name" },
    })
  })

  it("passes the request scope to the update workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeSupplier() })
    ;(updateSupplierModule.updateSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq()
    const res = makeRes()

    await POST(req, res)

    expect(updateSupplierModule.updateSupplierWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the updated supplier wrapped in a supplier key", async () => {
    const supplier = makeSupplier({ name: "New Name" })
    const mockRun = jest.fn().mockResolvedValue({ result: supplier })
    ;(updateSupplierModule.updateSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq({ body: { name: "New Name" } })
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ supplier })
  })

  it("propagates errors from the update workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Supplier not found"))
    ;(updateSupplierModule.updateSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makePostReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Supplier not found")
  })
})

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe("DELETE /admin/purchase/suppliers/:id", () => {
  it("runs deleteSupplierWorkflow with the supplier id", async () => {
    const mockRun = jest.fn().mockResolvedValue({})
    ;(updateSupplierModule.deleteSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeDeleteReq({ supplierId: "sup_01" })
    const res = makeRes()

    await DELETE(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { id: "sup_01" } })
  })

  it("passes the request scope to the delete workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({})
    ;(updateSupplierModule.deleteSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeDeleteReq()
    const res = makeRes()

    await DELETE(req, res)

    expect(updateSupplierModule.deleteSupplierWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns a deleted response with id and deleted: true", async () => {
    const mockRun = jest.fn().mockResolvedValue({})
    ;(updateSupplierModule.deleteSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeDeleteReq({ supplierId: "sup_01" })
    const res = makeRes()

    await DELETE(req, res)

    expect(res.json).toHaveBeenCalledWith({
      id: "sup_01",
      object: "supplier",
      deleted: true,
    })
  })

  it("uses the correct supplier id from URL params", async () => {
    const mockRun = jest.fn().mockResolvedValue({})
    ;(updateSupplierModule.deleteSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeDeleteReq({ supplierId: "sup_999" })
    const res = makeRes()

    await DELETE(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { id: "sup_999" } })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sup_999" })
    )
  })

  it("propagates errors from the delete workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Cannot delete supplier with active orders"))
    ;(updateSupplierModule.deleteSupplierWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeDeleteReq()
    const res = makeRes()

    await expect(DELETE(req, res)).rejects.toThrow("Cannot delete supplier with active orders")
  })
})
