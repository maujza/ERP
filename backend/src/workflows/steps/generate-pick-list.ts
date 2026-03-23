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
  variant_id: string | null
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

type OrderLineItem = {
  id: string
  variant_id?: string | null
  title?: string | null
  variant_title?: string | null
  quantity: number
}

type VariantRow = {
  id: string
  sku?: string | null
  product?: { images?: { url: string }[] } | null
}

type FulfillmentRow = {
  id: string
  canceled_at?: string | Date | null
}

type OrderFulfillmentRow = {
  id: string
  fulfillments?: FulfillmentRow[]
}

type FulfillmentRecordRow = {
  id: string
  status: string
  order_id: string
}

export async function generatePickListHandler(
  input: Input,
  { container }: { container: unknown }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cont = container as any
  const fulfillmentService = cont.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService
  const orderService = cont.resolve(Modules.ORDER) as {
    retrieveOrder: (id: string, opts: { relations: string[] }) => Promise<{ items?: OrderLineItem[] }>
  }
  const query = cont.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: unknown[] }>
  }

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
  const variantIds = order.items
    .map((i) => i.variant_id)
    .filter((id): id is string => Boolean(id))

  const variantMap = new Map<string, { sku: string | null; image_url: string | null }>()

  if (variantIds.length > 0) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "product.images.url"],
      filters: { id: variantIds },
    })
    for (const v of variants as VariantRow[]) {
      variantMap.set(v.id, {
        sku: v.sku ?? null,
        image_url: v.product?.images?.[0]?.url ?? null,
      })
    }
  }

  const pickListItems: PickListItem[] = order.items.map((item) => {
    const variantData = item.variant_id ? variantMap.get(item.variant_id) : undefined
    return {
      variant_id: item.variant_id ?? null,
      title: item.title ?? item.variant_title ?? "Unknown",
      sku: variantData?.sku ?? null,
      quantity: item.quantity,
      image_url: variantData?.image_url ?? null,
    }
  })

  const existing = ((await fulfillmentService.listFulfillmentRecords({
    order_id: input.order_id,
  })) as FulfillmentRecordRow[])[0] ?? null

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
    ((orders[0] as OrderFulfillmentRow | undefined)?.fulfillments ?? []).find(
      (fulfillment) => !fulfillment.canceled_at
    ) ?? null

  let nativeFulfillmentId = existingActiveNativeFulfillment?.id ?? null
  let createdNativeFulfillmentId: string | null = null

  if (!nativeFulfillmentId) {
    try {
      const { result } = await createOrderFulfillmentWorkflow(cont).run({
        input: {
          order_id: input.order_id,
          items: order.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        },
      })

      nativeFulfillmentId = (result as { id: string }).id
      createdNativeFulfillmentId = (result as { id: string }).id
    } catch (err: unknown) {
      // Native fulfillment creation can fail for orders without a fulfillment
      // provider configured (e.g. demo/seeded orders). Our FulfillmentRecord is
      // the source of truth for the pick→pack→dispatch workflow, so we continue.
      const logger = cont.resolve(ContainerRegistrationKeys.LOGGER) as {
        warn: (msg: string) => void
      }
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(
        `[generate-pick-list] Skipping native fulfillment for order ${input.order_id}: ${msg}`
      )
    }
  }

  const record = existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await fulfillmentService.updateFulfillmentRecords({
        id: existing.id,
        status: "picking",
        pick_list: pickListItems,
      } as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await fulfillmentService.createFulfillmentRecords({
        order_id: input.order_id,
        status: "picking",
        pick_list: pickListItems as unknown,
      } as any)

  const recordRow = record as { id: string }

  return new StepResponse(record, {
    order_id: input.order_id,
    record_id: recordRow.id,
    was_existing: !!existing,
    created_native_fulfillment_id: createdNativeFulfillmentId,
  } as CompensationData)
}

export async function compensateGeneratePickList(
  data: CompensationData | undefined,
  { container }: { container: unknown }
) {
  if (!data) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cont = container as any
  const fulfillmentService = cont.resolve(
    PURCHASE_DEPARTMENT_MODULE
  ) as PurchaseDepartmentModuleService

  if (data.was_existing) {
    await fulfillmentService.updateFulfillmentRecords({
      id: data.record_id,
      status: "pending",
      pick_list: null,
    })
  } else {
    await fulfillmentService.deleteFulfillmentRecords(data.record_id)
  }

  if (data.created_native_fulfillment_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await cancelOrderFulfillmentWorkflow(cont as any).run({
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
