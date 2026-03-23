// updateSupplierStep does not export raw handler functions, so we intercept
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
import "../../../../src/workflows/steps/update-supplier"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "sup_01",
    name: "Updated Supplier",
    email: "new@example.com",
    phone: "+54999999999",
    address: "Córdoba, AR",
    notes: "Updated notes",
    ...overrides,
  }
}

function makeService(supplier: ReturnType<typeof makeSupplier> = makeSupplier()) {
  return {
    updateSuppliers: jest.fn().mockResolvedValue(supplier),
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

describe("updateSupplierStep — invoke handler", () => {
  it("calls updateSuppliers with id and all update fields", async () => {
    const supplier = makeSupplier()
    const service = makeService(supplier)
    const container = makeContainer(service)

    const input = {
      id: "sup_01",
      name: "Updated Supplier",
      email: "new@example.com",
      phone: "+54999999999",
      address: "Córdoba, AR",
      notes: "Updated notes",
    }

    await capturedHandler(input, { container })

    expect(service.updateSuppliers).toHaveBeenCalledWith({
      id: "sup_01",
      name: "Updated Supplier",
      email: "new@example.com",
      phone: "+54999999999",
      address: "Córdoba, AR",
      notes: "Updated notes",
    })
  })

  it("calls updateSuppliers with only the id when no optional fields are provided", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await capturedHandler({ id: "sup_01" }, { container })

    expect(service.updateSuppliers).toHaveBeenCalledWith({ id: "sup_01" })
  })

  it("allows setting fields to null (clear email)", async () => {
    const supplier = makeSupplier({ email: null })
    const service = makeService(supplier)
    const container = makeContainer(service)

    await capturedHandler({ id: "sup_01", email: null }, { container })

    expect(service.updateSuppliers).toHaveBeenCalledWith({ id: "sup_01", email: null })
  })

  it("returns a StepResponse whose output is the updated supplier", async () => {
    const supplier = makeSupplier({ name: "New Name" })
    const service = makeService(supplier)
    const container = makeContainer(service)

    const response = await capturedHandler({ id: "sup_01", name: "New Name" }, { container })

    expect(response).toBeInstanceOf(StepResponse)
    expect(response.output).toMatchObject({ id: "sup_01", name: "New Name" })
  })

  it("returns a StepResponse with compensateInput equal to the supplier (single-arg StepResponse)", async () => {
    const supplier = makeSupplier()
    const service = makeService(supplier)
    const container = makeContainer(service)

    const response = await capturedHandler({ id: "sup_01" }, { container })

    // When StepResponse is called with a single argument, compensateInput === output
    expect(response.compensateInput).toEqual(response.output)
  })

  it("propagates errors thrown by updateSuppliers", async () => {
    const service = makeService()
    service.updateSuppliers.mockRejectedValue(new Error("Supplier not found"))
    const container = makeContainer(service)

    await expect(
      capturedHandler({ id: "sup_missing" }, { container })
    ).rejects.toThrow("Supplier not found")
  })

  it("separates id from data when calling updateSuppliers", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await capturedHandler({ id: "sup_01", name: "Only Name" }, { container })

    const callArg = service.updateSuppliers.mock.calls[0][0]
    expect(callArg).toHaveProperty("id", "sup_01")
    expect(callArg).toHaveProperty("name", "Only Name")
  })
})
