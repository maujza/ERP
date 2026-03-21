import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
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
  record_id: string
  was_existing: boolean
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

  const pickListItems: PickListItem[] = []

  for (const item of order.items as any[]) {
    let imageUrl: string | null = null
    let sku: string | null = null

    if (item.variant_id) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "sku", "product.images.url"],
        filters: { id: item.variant_id },
      })
      const variant = variants[0]
      if (variant) {
        sku = variant.sku ?? null
        imageUrl = variant.product?.images?.[0]?.url ?? null
      }
    }

    pickListItems.push({
      variant_id: item.variant_id,
      title: item.title ?? item.variant_title ?? "Unknown",
      sku,
      quantity: item.quantity,
      image_url: imageUrl,
    })
  }

  const existing = (await fulfillmentService.listFulfillmentRecords({
    order_id: input.order_id,
  }))[0] ?? null

  let record: any

  if (!existing) {
    record = await (fulfillmentService as any).createFulfillmentRecords({
      order_id: input.order_id,
      status: "picking",
      pick_list: pickListItems as any,
    })
  } else {
    if (existing.status !== "pending") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cannot start picking: order is already in status '${existing.status}'`
      )
    }
    record = await (fulfillmentService as any).updateFulfillmentRecords({
      id: existing.id,
      status: "picking",
      pick_list: pickListItems as any,
    })
  }

  return new StepResponse(record, {
    record_id: record.id,
    was_existing: !!existing,
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
}

export const generatePickListStep = createStep(
  "generate-pick-list",
  generatePickListHandler,
  compensateGeneratePickList
)
