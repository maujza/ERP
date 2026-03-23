// createSupplierStep does not export raw handler functions, so we intercept
// the createStep call to capture the handler and compensation function.
// We use `var` so the variable declarations are hoisted above jest.mock().

import { StepResponse } from "@medusajs/framework/workflows-sdk"

// eslint-disable-next-line no-var
var capturedHandler: Function
// eslint-disable-next-line no-var
var capturedCompensation: Function | undefined

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")
  return {
    ...actual,
    createStep: jest.fn(
      (_name: string, handler: Function, compensate?: Function) => {
        capturedHandler = handler
        capturedCompensation = compensate
        return jest.fn()
      }
    ),
  }
})

// Import after mock is registered so createStep is intercepted on module load
// eslint-disable-next-line import/first
import "../../../../src/workflows/steps/create-supplier"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "sup_01",
    name: "Acme Jewelry",
    email: "contact@acme.com",
    phone: "+54911234567",
    address: "Buenos Aires, AR",
    notes: "Reliable supplier",
    ...overrides,
  }
}

function makeService(supplier: ReturnType<typeof makeSupplier> | null = makeSupplier()) {
  return {
    createSuppliers: jest.fn().mockResolvedValue(supplier),
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

describe("createSupplierStep — invoke handler", () => {
  it("calls createSuppliers with the full input", async () => {
    const supplier = makeSupplier()
    const service = makeService(supplier)
    const container = makeContainer(service)

    const input = {
      name: "Acme Jewelry",
      email: "contact@acme.com",
      phone: "+54911234567",
      address: "Buenos Aires, AR",
      notes: "Reliable supplier",
    }

    await capturedHandler(input, { container })

    expect(service.createSuppliers).toHaveBeenCalledWith(input)
  })

  it("creates a supplier with only the required name field", async () => {
    const supplier = makeSupplier({ email: null, phone: null, address: null, notes: null })
    const service = makeService(supplier)
    const container = makeContainer(service)

    await capturedHandler({ name: "Minimal Supplier" }, { container })

    expect(service.createSuppliers).toHaveBeenCalledWith({ name: "Minimal Supplier" })
  })

  it("returns a StepResponse whose output is the created supplier", async () => {
    const supplier = makeSupplier()
    const service = makeService(supplier)
    const container = makeContainer(service)

    const response = await capturedHandler({ name: "Acme Jewelry" }, { container })

    expect(response).toBeInstanceOf(StepResponse)
    expect(response.output).toMatchObject({ id: "sup_01", name: "Acme Jewelry" })
  })

  it("stores the new supplier id as compensation data", async () => {
    const supplier = makeSupplier({ id: "sup_99" })
    const service = makeService(supplier)
    const container = makeContainer(service)

    const response = await capturedHandler({ name: "Test Supplier" }, { container })

    expect(response.compensateInput).toBe("sup_99")
  })

  it("propagates errors thrown by createSuppliers", async () => {
    const service = makeService()
    service.createSuppliers.mockRejectedValue(new Error("DB error"))
    const container = makeContainer(service)

    await expect(
      capturedHandler({ name: "Bad Supplier" }, { container })
    ).rejects.toThrow("DB error")
  })
})

describe("createSupplierStep — compensation handler", () => {
  it("deletes the supplier using the id stored during invoke", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await capturedCompensation!("sup_01", { container })

    expect(service.deleteSuppliers).toHaveBeenCalledWith("sup_01")
  })

  it("handles undefined supplierId gracefully (should not crash)", async () => {
    const service = makeService()
    const container = makeContainer(service)

    await expect(
      capturedCompensation!(undefined, { container })
    ).resolves.not.toThrow()
  })
})
