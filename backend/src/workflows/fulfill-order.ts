/**
 * Dual-track fulfillment architecture (intentional design):
 *
 * 1. Custom track (FulfillmentRecord) — source of truth for warehouse operations.
 *    Tracks the full lifecycle: pending → picking → packed → dispatched → cancelled.
 *    Carries warehouse-specific fields: pick_list, packed_weight, packed_dimensions,
 *    tracking_number, last_notified_at. Powers KPI tiles and the packed-not-shipped job.
 *
 * 2. Native Medusa fulfillment — synced best-effort from within these steps.
 *    `generatePickListStep` calls `createOrderFulfillmentWorkflow` when picking starts.
 *    `dispatchOrderStep` calls `createShipmentWorkflow` to register tracking.
 *    Both calls are wrapped in try/catch so a native-sync error never blocks the
 *    custom warehouse flow (our FulfillmentRecord is always the authoritative state).
 *
 * Do NOT collapse the two tracks. The native fulfillment is there to keep Medusa's
 * order status display accurate; the custom FulfillmentRecord drives the actual ops.
 */
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
