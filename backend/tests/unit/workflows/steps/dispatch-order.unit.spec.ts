jest.mock("@medusajs/core-flows", () => ({
  createShipmentWorkflow: jest.fn(),
}))

import { MedusaError } from "@medusajs/framework/utils"
import { createShipmentWorkflow } from "@medusajs/core-flows"
import { dispatchOrderHandler } from "../../../../src/workflows/steps/dispatch-order"

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRecord(status: string, extra: any = {}) {
  return { id: "fr_1", order_id: "order_1", status, tracking_number: null, ...extra }
}

function makeFulfillmentService(record: any) {
  return {
    listFulfillmentRecords: jest.fn().mockResolvedValue(record ? [record] : []),
    updateFulfillmentRecords: jest
      .fn()
      .mockImplementation((data) => Promise.resolve({ ...record, ...data })),
  }
}

function makeShipmentRun() {
  return {
    run: jest.fn().mockResolvedValue({}),
  }
}

function makeQuery(fulfillments: any[] = []) {
  return {
    graph: jest.fn().mockResolvedValue({
      data: [{ id: "order_1", fulfillments }],
    }),
  }
}

const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() }

function makeContainer(
  fulfillmentService: any,
  query: any = makeQuery()
) {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return fulfillmentService
      if (key === "query") return query
      if (key === "logger") return mockLogger
      return {}
    }),
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("dispatchOrderHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createShipmentWorkflow as jest.Mock).mockReturnValue(makeShipmentRun())
  })

  it("transitions a packed order to dispatched with tracking number", async () => {
    const record = makeRecord("packed")
    const fulfillmentService = makeFulfillmentService(record)
    const container = makeContainer(fulfillmentService)

    await dispatchOrderHandler(
      { order_id: "order_1", tracking_number: "TRK-12345" },
      { container }
    )

    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fr_1",
        status: "dispatched",
        tracking_number: "TRK-12345",
      })
    )
  })

  it("returns no-op when order is already dispatched (idempotency)", async () => {
    const record = makeRecord("dispatched", { tracking_number: "TRK-OLD" })
    const fulfillmentService = makeFulfillmentService(record)
    const container = makeContainer(fulfillmentService)

    const response = await dispatchOrderHandler(
      { order_id: "order_1", tracking_number: "TRK-DUPLICATE" },
      { container }
    )

    expect(fulfillmentService.updateFulfillmentRecords).not.toHaveBeenCalled()
    expect(response.compensateInput).toBeNull()
  })

  it("throws when tracking_number is empty string", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("packed")))

    await expect(
      dispatchOrderHandler({ order_id: "order_1", tracking_number: "" }, { container })
    ).rejects.toThrow(MedusaError)
  })

  it("throws when order is not in packed status", async () => {
    const container = makeContainer(makeFulfillmentService(makeRecord("picking")))

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).rejects.toThrow(/expected 'packed'/i)
  })

  it("calls createShipment when Medusa native fulfillment exists for the order", async () => {
    const record = makeRecord("packed")
    const fulfillmentService = makeFulfillmentService(record)
    const query = makeQuery([{ id: "fulfillment_123" }])
    const container = makeContainer(fulfillmentService, query)

    await dispatchOrderHandler(
      { order_id: "order_1", tracking_number: "TRK-12345" },
      { container }
    )

    expect(createShipmentWorkflow).toHaveBeenCalledWith(container)
    const workflow = (createShipmentWorkflow as jest.Mock).mock.results[0].value
    expect(workflow.run).toHaveBeenCalledWith({
      input: {
        id: "fulfillment_123",
        labels: [
          {
            tracking_number: "TRK-12345",
            tracking_url: "#",
            label_url: "#",
          },
        ],
      },
    })
  })

  it("skips createShipment when no native Medusa fulfillment exists (best-effort)", async () => {
    const record = makeRecord("packed")
    const fulfillmentService = makeFulfillmentService(record)
    const query = makeQuery([])
    const container = makeContainer(fulfillmentService, query)

    await dispatchOrderHandler(
      { order_id: "order_1", tracking_number: "TRK-12345" },
      { container }
    )

    // FulfillmentRecord should still be updated to dispatched
    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dispatched" })
    )
    expect(createShipmentWorkflow).not.toHaveBeenCalled()
  })

  it("logs warning but still dispatches when Medusa order service throws (best-effort)", async () => {
    const record = makeRecord("packed")
    const fulfillmentService = makeFulfillmentService(record)
    const brokenQuery = {
      graph: jest.fn().mockRejectedValue(new Error("Query service down")),
    }
    const container = makeContainer(fulfillmentService, brokenQuery)

    // Should NOT throw — Medusa sync is best-effort
    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).resolves.not.toThrow()

    // FulfillmentRecord MUST still be dispatched
    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dispatched" })
    )
    // Warning was logged
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("dispatch-order")
    )
  })

  it("logs warning but still dispatches when shipment workflow fails", async () => {
    const record = makeRecord("packed")
    const fulfillmentService = makeFulfillmentService(record)
    const query = makeQuery([{ id: "fulfillment_123" }])
    const workflow = {
      run: jest.fn().mockRejectedValue(new Error("Shipment workflow failed")),
    }
    ;(createShipmentWorkflow as jest.Mock).mockReturnValue(workflow)
    const container = makeContainer(fulfillmentService, query)

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).resolves.not.toThrow()

    expect(workflow.run).toHaveBeenCalled()
    expect(fulfillmentService.updateFulfillmentRecords).toHaveBeenCalledWith(
      expect.objectContaining({ status: "dispatched" })
    )
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("createShipmentWorkflow failed")
    )
  })

  it("throws when no fulfillment record exists", async () => {
    const container = makeContainer(makeFulfillmentService(null))

    await expect(
      dispatchOrderHandler(
        { order_id: "order_1", tracking_number: "TRK-12345" },
        { container }
      )
    ).rejects.toThrow(MedusaError)
  })
})
