// deleteSupplierStep does not export raw handler functions, so we intercept
// the createStep call to capture the handler.
// We use `var` so the variable declaration is hoisted above jest.mock().

import { StepResponse } from "@medusajs/framework/workflows-sdk"

// eslint-disable-next-line no-var
var capturedHandler: Function

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")
  return {
    ...actual,
    createStep: jest.fn(
      (_name: string, handler: Function, _compensate?: Function) => {
        capturedHandler = handler
        return jest.fn()
      }
    ),
  }
})

// Import after mock is registered
// eslint-disable-next-line import/first
import "../../../../src/workflows/steps/delete-supplier"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeService() {
  return {
    deleteSuppliers: jest.fn().mockResolvedValue(undefined),
  }
}

function makeContainer(service: ReturnType<typeof makeService>) {
  return {
    resolve: jest.fn((key: string) => {
      if (key === "purchaseDepartment") return service
      throw new Error(`Unknown service: ${key}`)
    }),
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("deleteSupplierStep — invoke handler", () => {
  it("calls deleteSuppliers with the provided supplier id", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await capturedHandler({ id: "sup_01" }, { container })

    expect(service.deleteSuppliers).toHaveBeenCalledWith("sup_01")
  })

  it("calls deleteSuppliers exactly once", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await capturedHandler({ id: "sup_42" }, { container })

    expect(service.deleteSuppliers).toHaveBeenCalledTimes(1)
  })

  it("returns a StepResponse whose output contains the deleted supplier id", async () => {
    const service = makeService()
    const container = makeContainer(service)

    const response = await capturedHandler({ id: "sup_01" }, { container })

    expect(response).toBeInstanceOf(StepResponse)
    expect(response.output).toEqual({ id: "sup_01" })
  })

  it("propagates errors thrown by deleteSuppliers", async () => {
    const service = makeService()
    service.deleteSuppliers.mockRejectedValue(new Error("Foreign key constraint"))
    const container = makeContainer(service)

    await expect(
      capturedHandler({ id: "sup_01" }, { container })
    ).rejects.toThrow("Foreign key constraint")
  })

  it("resolves the purchaseDepartment service from the container", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await capturedHandler({ id: "sup_01" }, { container })

    expect(container.resolve).toHaveBeenCalledWith("purchaseDepartment")
  })
})
