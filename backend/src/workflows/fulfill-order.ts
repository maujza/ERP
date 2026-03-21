import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { generatePickListStep } from "./steps/generate-pick-list"
import { confirmPackStep, ConfirmPackInput } from "./steps/confirm-pack"
import { dispatchOrderStep, DispatchOrderInput } from "./steps/dispatch-order"

// ── Pick workflow ─────────────────────────────────────────────────────────────

export const startPickingWorkflow = createWorkflow(
  "start-picking",
  function (input: { order_id: string }) {
    const record = generatePickListStep(input)
    return new WorkflowResponse(record)
  }
)

// ── Pack workflow ─────────────────────────────────────────────────────────────

export const confirmPackWorkflow = createWorkflow(
  "confirm-pack",
  function (input: ConfirmPackInput) {
    const record = confirmPackStep(input)
    return new WorkflowResponse(record)
  }
)

// ── Dispatch workflow ─────────────────────────────────────────────────────────

export const dispatchOrderWorkflow = createWorkflow(
  "dispatch-order",
  function (input: DispatchOrderInput) {
    const record = dispatchOrderStep(input)
    return new WorkflowResponse(record)
  }
)
