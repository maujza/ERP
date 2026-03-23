import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

export const ConfirmPackInputSchema = z.object({
  order_id: z.string().min(1),
  packed_weight: z.number().positive({ message: "packed_weight must be a positive number" }),
  packed_dimensions: z.string().min(1).optional(),
})

export type ConfirmPackInput = z.infer<typeof ConfirmPackInputSchema>

type CompensationData = {
  record_id: string
  previous_weight: number | null
  previous_dimensions: string | null
}

export async function confirmPackHandler(
  input: ConfirmPackInput,
  { container }: { container: any }
) {
  const validated = ConfirmPackInputSchema.safeParse(input)
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

  if (record.status !== "picking") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Cannot pack: order is in status '${record.status}', expected 'picking'`
    )
  }

  const updated = await fulfillmentService.updateFulfillmentRecords({
    id: record.id,
    status: "packed",
    packed_weight: input.packed_weight,
    packed_dimensions: input.packed_dimensions ?? null,
  })

  return new StepResponse(updated, {
    record_id: record.id,
    previous_weight: record.packed_weight ?? null,
    previous_dimensions: record.packed_dimensions ?? null,
  } as CompensationData)
}

export async function compensateConfirmPack(
  data: CompensationData | undefined,
  { container }: { container: any }
) {
  if (!data) return
  const fulfillmentService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  await fulfillmentService.updateFulfillmentRecords({
    id: data.record_id,
    status: "picking",
    packed_weight: data.previous_weight,
    packed_dimensions: data.previous_dimensions,
  })
}

export const confirmPackStep = createStep(
  "confirm-pack",
  confirmPackHandler,
  compensateConfirmPack
)
