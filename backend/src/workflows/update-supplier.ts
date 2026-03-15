import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateSupplierStep } from "./steps/update-supplier"
import { deleteSupplierStep } from "./steps/delete-supplier"

type UpdateInput = {
  id: string
  name?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
}

type DeleteInput = {
  id: string
}

export const updateSupplierWorkflow = createWorkflow(
  "update-supplier",
  function (input: UpdateInput) {
    const supplier = updateSupplierStep(input)
    return new WorkflowResponse(supplier)
  }
)

export const deleteSupplierWorkflow = createWorkflow(
  "delete-supplier",
  function (input: DeleteInput) {
    const result = deleteSupplierStep(input)
    return new WorkflowResponse(result)
  }
)
