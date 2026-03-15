import { defineLink } from "@medusajs/framework/utils"
import PricingModule from "@medusajs/medusa/pricing"
import PurchaseDepartmentModule from "../modules/purchaseDepartment"

export default defineLink(
  PurchaseDepartmentModule.linkable.purchaseOrder,
  PricingModule.linkable.priceList
)
