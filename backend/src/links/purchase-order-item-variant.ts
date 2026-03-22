import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PurchaseDepartmentModule from "../modules/purchaseDepartment"

export default defineLink(
  {
    linkable: PurchaseDepartmentModule.linkable.purchaseOrderItem,
    isList: true,
  },
  ProductModule.linkable.productVariant
)
