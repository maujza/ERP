jest.mock("../../../../../src/workflows/receive-purchase-order", () => ({
  __esModule: true,
  default: jest.fn(),
}))

import { POST } from "../../../../../src/api/admin/purchase/orders/[id]/receive/route"
import receivePurchaseOrderWorkflow from "../../../../../src/workflows/receive-purchase-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po_01",
    status: "received",
    ...overrides,
  }
}

type ReceiveItem = { item_id: string; received_quantity: number }

function makeReq({
  orderId = "po_01",
  location_id = "loc_01",
  items = [] as ReceiveItem[],
}: {
  orderId?: string
  location_id?: string
  items?: ReceiveItem[]
} = {}) {
  return {
    params: { id: orderId },
    validatedBody: { location_id, items },
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

describe("POST /admin/purchase/orders/:id/receive", () => {
  it("runs receivePurchaseOrderWorkflow with order_id, location_id and items", async () => {
    const order = makeOrder()
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(receivePurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const items: ReceiveItem[] = [{ item_id: "poi_01", received_quantity: 3 }]
    const req = makeReq({ orderId: "po_01", location_id: "loc_01", items })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: {
        order_id: "po_01",
        location_id: "loc_01",
        items,
      },
    })
  })

  it("passes the request scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder() })
    ;(receivePurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(receivePurchaseOrderWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the workflow result wrapped in an order key", async () => {
    const order = makeOrder({ status: "received" })
    const mockRun = jest.fn().mockResolvedValue({ result: order })
    ;(receivePurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ order })
  })

  it("handles an empty items array", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder() })
    ;(receivePurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ items: [] })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: expect.objectContaining({ items: [] }),
    })
  })

  it("uses the correct order id from URL params", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeOrder({ id: "po_999" }) })
    ;(receivePurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "po_999", location_id: "loc_99", items: [] })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: expect.objectContaining({ order_id: "po_999" }),
    })
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Order not in submitted status"))
    ;(receivePurchaseOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Order not in submitted status")
  })
})
