import { model } from "@medusajs/framework/utils"
import PurchaseOrder from "./purchase-order"

const PurchaseOrderItem = model.define("purchase_order_item", {
  id: model.id().primaryKey(),
  variant_id: model.text(),
  quantity: model.number(),
  unit_cost: model.number(),
  received_quantity: model.number().default(0),
  purchase_order: model.belongsTo(() => PurchaseOrder, {
    mappedBy: "items",
  }),
})

export default PurchaseOrderItem
