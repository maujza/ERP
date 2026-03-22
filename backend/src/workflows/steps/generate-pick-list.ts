import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createOrderFulfillmentWorkflow, cancelOrderFulfillmentWorkflow } from "@medusajs/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = {
  order_id: string
}

type PickListItem = {
  variant_id: string
  title: string
  sku: string | null
  quantity: number
  image_url: string | null
}

type CompensationData = {
  order_id: string
  record_id: string
  was_existing: boolean
  created_native_fulfillment_id: string | null
}

export async function generatePickListHandler(
  input: Input,
  { container }: { container: any }
) {
  const fulfillmentService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  const orderService = container.resolve(Modules.ORDER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const order = await orderService.retrieveOrder(input.order_id, {
    relations: ["items"],
  })

  if (!order.items || order.items.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cannot generate pick list: order has no line items"
    )
  }

  // Batch-fetch all variants in one query instead of N individual calls.
  const variantIds = (order.items as any[])
    .map((i) => i.variant_id)
    .filter(Boolean) as string[]

  const variantMap = new Map<string, { sku: string | null; image_url: string | null }>()

  if (variantIds.length > 0) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "product.images.url"],
      filters: { id: variantIds },
    })
    for (const v of variants as any[]) {
      variantMap.set(v.id, {
        sku: v.sku ?? null,
        image_url: v.product?.images?.[0]?.url ?? null,
      })
    }
  }

  const pickListItems: PickListItem[] = (order.items as any[]).map((item) => {
    const variantData = item.variant_id ? variantMap.get(item.variant_id) : undefined
    return {
      variant_id: item.variant_id,
      title: item.title ?? item.variant_title ?? "Unknown",
      sku: variantData?.sku ?? null,
      quantity: item.quantity,
      image_url: variantData?.image_url ?? null,
    }
  })

  const existing = (await fulfillmentService.listFulfillmentRecords({
    order_id: input.order_id,
  }))[0] ?? null

  if (existing && existing.status !== "pending") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Cannot start picking: order is already in status '${existing.status}'`
    )
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "fulfillments.id", "fulfillments.canceled_at"],
    filters: { id: input.order_id },
  })

  const existingActiveNativeFulfillment =
    (orders[0]?.fulfillments ?? []).find(
      (fulfillment: any) => !fulfillment?.canceled_at
    ) ?? null

  let nativeFulfillmentId = existingActiveNativeFulfillment?.id ?? null
  let createdNativeFulfillmentId: string | null = null

  if (!nativeFulfillmentId) {
    const { result } = await createOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: input.order_id,
        items: (order.items as any[]).map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      },
    })

    nativeFulfillmentId = result.id
    createdNativeFulfillmentId = result.id
  }

  let record: any

  if (!existing) {
    record = await (fulfillmentService as any).createFulfillmentRecords({
      order_id: input.order_id,
      status: "picking",
      pick_list: pickListItems as any,
    })
  } else {
    record = await (fulfillmentService as any).updateFulfillmentRecords({
      id: existing.id,
      status: "picking",
      pick_list: pickListItems as any,
    })
  }

  return new StepResponse(record, {
    order_id: input.order_id,
    record_id: record.id,
    was_existing: !!existing,
    created_native_fulfillment_id: createdNativeFulfillmentId,
  } as CompensationData)
}

async function compensateGeneratePickList(
  data: CompensationData | undefined,
  { container }: { container: any }
) {
  if (!data) return
  const fulfillmentService = container.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService

  if (data.was_existing) {
    await (fulfillmentService as any).updateFulfillmentRecords({
      id: data.record_id,
      status: "pending",
      pick_list: null,
    })
  } else {
    await (fulfillmentService as any).deleteFulfillmentRecords(data.record_id)
  }

  if (data.created_native_fulfillment_id) {
    await cancelOrderFulfillmentWorkflow(container).run({
      input: {
        order_id: data.order_id,
        fulfillment_id: data.created_native_fulfillment_id,
      },
    })
  }
}

export const generatePickListStep = createStep(
  "generate-pick-list",
  generatePickListHandler,
  compensateGeneratePickList
)
