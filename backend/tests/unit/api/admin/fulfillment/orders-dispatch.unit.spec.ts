jest.mock("../../../../../src/workflows/fulfill-order", () => ({
  startPickingWorkflow: jest.fn(),
  confirmPackWorkflow: jest.fn(),
  dispatchOrderWorkflow: jest.fn(),
}))

import { POST } from "../../../../../src/api/admin/fulfillment/orders/[id]/dispatch/route"
import * as fulfillOrderModule from "../../../../../src/workflows/fulfill-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "fr_01",
    order_id: "order_01",
    status: "dispatched",
    tracking_number: "TRACK123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeReq({
  orderId = "order_01",
  tracking_number = "TRACK123",
}: {
  orderId?: string
  tracking_number?: string
} = {}) {
  return {
    params: { id: orderId },
    validatedBody: { tracking_number },
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

describe("POST /admin/fulfillment/orders/:id/dispatch", () => {
  it("runs dispatchOrderWorkflow with order_id and tracking_number", async () => {
    const record = makeRecord()
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.dispatchOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "order_01", tracking_number: "TRACK123" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_01",
        tracking_number: "TRACK123",
      },
    })
  })

  it("passes the request scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeRecord() })
    ;(fulfillOrderModule.dispatchOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(fulfillOrderModule.dispatchOrderWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the workflow result wrapped in a fulfillment key", async () => {
    const record = makeRecord({ status: "dispatched" })
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.dispatchOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ fulfillment: record })
  })

  it("uses the correct order_id from URL params (not hardcoded)", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeRecord({ order_id: "order_777" }) })
    ;(fulfillOrderModule.dispatchOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "order_777", tracking_number: "XYZ789" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: { order_id: "order_777", tracking_number: "XYZ789" },
    })
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Cannot dispatch unpacked order"))
    ;(fulfillOrderModule.dispatchOrderWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Cannot dispatch unpacked order")
  })
})
