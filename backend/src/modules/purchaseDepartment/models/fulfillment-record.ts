import { model } from "@medusajs/framework/utils"

// Tracks the custom fulfillment lifecycle for a Medusa order.
//
// State machine:
//
//   pending ──pick──▶ picking ──pack──▶ packed ──dispatch──▶ dispatched
//      │                │                 │
//      └──cancel──▶ cancelled ◀───────────┘
//
// One record per order_id. Created automatically when pick is first called.
const FulfillmentRecord = model.define("fulfillment_record", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  status: model
    .enum(["pending", "picking", "packed", "dispatched", "cancelled"])
    .default("pending"),
  // JSON array: { variant_id, title, quantity, sku, image_url }[]
  pick_list: model.json().nullable(),
  packed_weight: model.number().nullable(),
  packed_dimensions: model.text().nullable(),
  tracking_number: model.text().nullable(),
  // Set after sending a packed-not-shipped notification; used for cooldown.
  last_notified_at: model.dateTime().nullable(),
})

export default FulfillmentRecord
