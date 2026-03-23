jest.mock("../../../../../src/workflows/fulfill-order", () => ({
  startPickingWorkflow: jest.fn(),
  confirmPackWorkflow: jest.fn(),
  dispatchOrderWorkflow: jest.fn(),
}))

import { POST } from "../../../../../src/api/admin/fulfillment/orders/[id]/pack/route"
import * as fulfillOrderModule from "../../../../../src/workflows/fulfill-order"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "fr_01",
    order_id: "order_01",
    status: "packed",
    packed_weight: 0.5,
    packed_dimensions: "20x15x10",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeReq({
  orderId = "order_01",
  packed_weight = 0.5,
  packed_dimensions = "20x15x10" as string | undefined,
}: {
  orderId?: string
  packed_weight?: number
  packed_dimensions?: string
} = {}) {
  return {
    params: { id: orderId },
    validatedBody: { packed_weight, packed_dimensions },
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

describe("POST /admin/fulfillment/orders/:id/pack", () => {
  it("runs confirmPackWorkflow with the order_id and pack fields from body", async () => {
    const record = makeRecord()
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.confirmPackWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq({ orderId: "order_01", packed_weight: 0.5, packed_dimensions: "20x15x10" })
    const res = makeRes()

    await POST(req, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_01",
        packed_weight: 0.5,
        packed_dimensions: "20x15x10",
      },
    })
  })

  it("passes the request scope to the workflow", async () => {
    const mockRun = jest.fn().mockResolvedValue({ result: makeRecord() })
    ;(fulfillOrderModule.confirmPackWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(fulfillOrderModule.confirmPackWorkflow as jest.Mock).toHaveBeenCalledWith(req.scope)
  })

  it("returns the workflow result wrapped in a fulfillment key", async () => {
    const record = makeRecord({ status: "packed" })
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.confirmPackWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await POST(req, res)

    expect(res.json).toHaveBeenCalledWith({ fulfillment: record })
  })

  it("passes undefined packed_dimensions when not provided in body", async () => {
    const record = makeRecord({ packed_dimensions: undefined })
    const mockRun = jest.fn().mockResolvedValue({ result: record })
    ;(fulfillOrderModule.confirmPackWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const reqWithoutDimensions = {
      params: { id: "order_01" },
      validatedBody: { packed_weight: 0.3 },
      scope: Symbol("scope") as any,
    } as any
    const res = makeRes()

    await POST(reqWithoutDimensions, res)

    expect(mockRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_01",
        packed_weight: 0.3,
        packed_dimensions: undefined,
      },
    })
  })

  it("propagates errors thrown by the workflow", async () => {
    const mockRun = jest.fn().mockRejectedValue(new Error("Invalid pack state"))
    ;(fulfillOrderModule.confirmPackWorkflow as jest.Mock).mockReturnValue({ run: mockRun })

    const req = makeReq()
    const res = makeRes()

    await expect(POST(req, res)).rejects.toThrow("Invalid pack state")
  })
})
