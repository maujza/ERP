import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PurchaseDepartmentModule from "../modules/purchaseDepartment"

export default defineLink(
  PurchaseDepartmentModule.linkable.purchaseOrderItem,
  ProductModule.linkable.productVariant
)
