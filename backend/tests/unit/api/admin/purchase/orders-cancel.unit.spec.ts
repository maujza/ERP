jest.mock("../../../../../src/workflows/cancel-purchase-order", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import { POST } from "../../../../../src/api/admin/purchase/orders/[id]/cancel/route"
import cancelPurchaseOrderWorkflow from "../../../../../src/workflows/cancel-purchase-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po_01",
    supplier_id: "sup_01",
    status: "cancelled",
    ...overrides,
  }
}

function makeReq({ orderId = "po_01" }: { orderId?: string } = {}) {
  return {
    params: { id: orderId },
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

describe("POST /admin/purchase/orders/:id/cancel", () => {
  it("runs cancelPurchaseOrderWorkflow with the order id from params", async () => {
    const order = makeOrder()
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(cancelPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "po_01" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { order_id: "po_01" } })
  })

  it("passes the request scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder() })
    ;(cancelPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(cancelPurchaseOrderWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the workflow result wrapped in an order key", async () => {
    const order = makeOrder({ status: "cancelled" })
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(cancelPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ order })
  })

  it("uses the correct order id from URL params (not hardcoded)", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder({ id: "po_777" }) })
    ;(cancelPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "po_777" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { order_id: "po_777" } })
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Cannot cancel received order"))
    ;(cancelPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Cannot cancel received order")
  })
})
