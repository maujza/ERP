import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

export const DispatchOrderInputSchema = z.object({
  order_id: z.string().min(1),
  tracking_number: z.string().min(1, { message: "tracking_number must not be empty" }),
})

export type DispatchOrderInput = z.infer<typeof DispatchOrderInputSchema>

type CompensationData = { record_id: string } | null

export async function dispatchOrderHandler(
  input: DispatchOrderInput,
  { container }: { container: any }
) {
  const validated = DispatchOrderInputSchema.safeParse(input)
  if (!validated.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validated.error.issues.map((i) => i.message).join("; ")
    )
  }

  const fulfillmentService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService

  const [record] = await fulfillmentService.listFulfillmentRecords({
    order_id: input.order_id,
  })

  if (!record) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No fulfillment record found for order ${input.order_id}`
    )
  }

  // Idempotency guard: already dispatched → return early (no-op)
  if (record.status === "dispatched") {
    return new StepResponse(record, null as CompensationData)
  }

  if (record.status !== "packed") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Cannot dispatch: order is in status '${record.status}', expected 'packed'`
    )
  }

  // Notify Medusa's native fulfillment service.
  // Wrap in try/catch: if unavailable, surface a clear 503 so the
  // FulfillmentRecord stays in 'packed' and the operator can retry.
  try {
    const medusaFulfillmentService = container.resolve(Modules.FULFILLMENT)
    const fulfillments = await medusaFulfillmentService.listFulfillments(
      { order_id: input.order_id },
      { take: 1 }
    )
    if (fulfillments.length > 0) {
      await medusaFulfillmentService.createShipment(fulfillments[0].id, {
        tracking_numbers: [input.tracking_number],
      })
    }
  } catch (err: any) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Fulfillment service unavailable — order remains packed. Retry when the service recovers."
    )
  }

  const updated = await fulfillmentService.updateFulfillmentRecords({
    id: record.id,
    status: "dispatched",
    tracking_number: input.tracking_number,
  })

  return new StepResponse(updated, { record_id: record.id } as CompensationData)
}

async function compensateDispatchOrder(
  data: CompensationData | undefined,
  { container }: { container: any }
) {
  if (!data) return // no-op case (was already dispatched) — nothing to revert
  const fulfillmentService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  await fulfillmentService.updateFulfillmentRecords({
    id: data.record_id,
    status: "packed",
    tracking_number: null,
  })
}

export const dispatchOrderStep = createStep(
  "dispatch-order",
  dispatchOrderHandler,
  compensateDispatchOrder
)
