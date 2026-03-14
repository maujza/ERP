import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createSupplierStep } from "./steps/create-supplier"

type Input = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
}

export const createSupplierWorkflow = createWorkflow(
  "create-supplier",
  function (input: Input) {
    const supplier = createSupplierStep(input)
    return new WorkflowResponse(supplier)
  }
)

export default createSupplierWorkflow
