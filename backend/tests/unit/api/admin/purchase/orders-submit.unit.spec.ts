jest.mock("../../../../../src/workflows/submit-purchase-order", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import { POST } from "../../../../../src/api/admin/purchase/orders/[id]/submit/route"
import submitPurchaseOrderWorkflow from "../../../../../src/workflows/submit-purchase-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po_01",
    supplier_id: "sup_01",
    status: "submitted",
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

describe("POST /admin/purchase/orders/:id/submit", () => {
  it("runs submitPurchaseOrderWorkflow with the order id from params", async () => {
    const order = makeOrder()
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(submitPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "po_01" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { order_id: "po_01" } })
  })

  it("passes the request scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder() })
    ;(submitPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(submitPurchaseOrderWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the workflow result wrapped in an order key", async () => {
    const order = makeOrder({ status: "submitted" })
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(submitPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ order })
  })

  it("uses the correct order id from URL params (not hardcoded)", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder({ id: "po_555" }) })
    ;(submitPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "po_555" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { order_id: "po_555" } })
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Order is already submitted"))
    ;(submitPurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Order is already submitted")
  })
})
