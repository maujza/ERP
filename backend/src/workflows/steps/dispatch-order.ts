import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createShipmentWorkflow } from "@medusajs/core-flows"
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

  // Best-effort: sync dispatch to Medusa's native fulfillment service.
  // Our FulfillmentRecord is the source of truth — never block dispatch on failure.
  {
    const logger = container.resolve("logger")
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    // Retrieve the Medusa order with fulfillments; log + skip on any error.
    const { data: orders } = await query
      .graph({
        entity: "order",
        fields: ["id", "fulfillments.id", "fulfillments.canceled_at"],
        filters: { id: input.order_id },
      })
      .catch((err: any) => {
        logger.warn(
          `dispatch-order: Medusa native fulfillment sync skipped for ${input.order_id}: ${err?.message}`
        )
        return { data: [] }
      })
    const nativeFulfillmentId = (orders[0]?.fulfillments ?? []).find(
      (fulfillment: any) => !fulfillment?.canceled_at
    )?.id

    if (nativeFulfillmentId) {
      await createShipmentWorkflow(container)
        .run({
          input: {
            id: nativeFulfillmentId,
            labels: [
              {
                tracking_number: input.tracking_number,
                tracking_url: "#",
                label_url: "#",
              },
            ],
          },
        })
        .catch((err: any) => {
          logger.warn(
            `dispatch-order: createShipmentWorkflow failed for ${input.order_id}: ${err?.message}`
          )
        })
    }
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
