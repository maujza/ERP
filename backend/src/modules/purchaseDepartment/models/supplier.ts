import { model } from "@medusajs/framework/utils"

const Supplier = model.define("supplier", {
  id: model.id().primaryKey(),
  name: model.text(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  address: model.text().nullable(),
  notes: model.text().nullable(),
  // Cached fill rate (0-100). Updated on every PO receipt. Null = no received POs yet.
  fill_rate: model.number().nullable(),
})

export default Supplier
