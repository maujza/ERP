import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "./models/supplier"
import PurchaseOrder from "./models/purchase-order"
import PurchaseOrderItem from "./models/purchase-order-item"
import StockAdjustmentLog from "./models/stock-adjustment-log"
import FulfillmentRecord from "./models/fulfillment-record"

class PurchaseDepartmentModuleService extends MedusaService({
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  StockAdjustmentLog,
  FulfillmentRecord,
}) {}

export default PurchaseDepartmentModuleService
