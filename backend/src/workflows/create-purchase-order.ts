import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { PURCHASE_DEPARTMENT_MODULE } from "../modules/purchaseDepartment"
import { createPurchaseOrderStep } from "./steps/create-purchase-order"

type ItemInput = {
  variant_id: string
  quantity: number
  unit_cost: number
}

type Input = {
  supplier_id: string
  reference_number?: string | null
  notes?: string | null
  expected_delivery_date?: string | null
  items: ItemInput[]
}

export const createPurchaseOrderWorkflow = createWorkflow(
  "create-purchase-order",
  function (input: Input) {
    const { order, items } = createPurchaseOrderStep(input)

    // Link each PO item to its product variant
    const linkData = transform({ items }, ({ items }) =>
      items.map((item) => ({
        [PURCHASE_DEPARTMENT_MODULE]: {
          purchase_order_item_id: item.id,
        },
        product: {
          product_variant_id: item.variant_id,
        },
      }))
    )

    createRemoteLinkStep(linkData)

    return new WorkflowResponse({ order, items })
  }
)

export default createPurchaseOrderWorkflow
