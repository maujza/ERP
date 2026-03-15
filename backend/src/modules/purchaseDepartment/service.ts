import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "./models/supplier"
import PurchaseOrder from "./models/purchase-order"
import PurchaseOrderItem from "./models/purchase-order-item"

class PurchaseDepartmentModuleService extends MedusaService({
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
}) {}

export default PurchaseDepartmentModuleService
