import { model } from "@medusajs/framework/utils"
import PurchaseOrderItem from "./purchase-order-item"

const PurchaseOrder = model.define("purchase_order", {
  id: model.id().primaryKey(),
  supplier_id: model.text(),
  reference_number: model.text().nullable(),
  status: model.enum(["draft", "submitted", "received", "cancelled"]).default("draft"),
  notes: model.text().nullable(),
  expected_delivery_date: model.dateTime().nullable(),
  // Set on receipt when received_qty ≠ ordered_qty for any line item.
  discrepancy_count: model.number().default(0),
  items: model.hasMany(() => PurchaseOrderItem, { mappedBy: "purchase_order" }),
})

export default PurchaseOrder
