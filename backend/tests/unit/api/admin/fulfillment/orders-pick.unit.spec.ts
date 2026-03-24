// Mock the workflow module before importing the route.
// Note: jest.mock is hoisted, so we cannot reference variables declared with
// const/let in the factory. Instead, we assign the mock to the module's export
// and access it via require() after the mock is in place.

jest.mock("../../../../../src/workflows/fulfill-order", () => ({
  startPickingWorkflow: jest.fn(),
  confirmPackWorkflow: jest.fn(),
  dispatchOrderWorkflow: jest.fn(),
}))

import { POST } from "../../../../../src/api/admin/fulfillment/orders/[id]/pick/route"
import * as fulfillOrderModule from "../../../../../src/workflows/fulfill-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "fr_01",
    order_id: "order_01",
    status: "picking",
    pick_list: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeReq({ orderId = "order_01" }: { orderId?: string } = {}) {
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

describe("POST /admin/fulfillment/orders/:id/pick", () => {
  it("runs the startPickingWorkflow with the order_id from params", async () => {
    const record = makeRecord()
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.startPickingWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "order_01" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { order_id: "order_01" } })
  })

  it("passes the request scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeRecord() })
    ;(fulfillOrderModule.startPickingWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(fulfillOrderModule.startPickingWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the workflow result wrapped in a fulfillment key", async () => {
    const record = makeRecord({ status: "picking" })
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.startPickingWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ fulfillment: record })
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Workflow failed"))
    ;(fulfillOrderModule.startPickingWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Workflow failed")
  })

  it("uses the correct order_id from params (not hardcoded)", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeRecord({ order_id: "order_999" }) })
    ;(fulfillOrderModule.startPickingWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "order_999" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({ input: { order_id: "order_999" } })
  })
})
