import { Module } from "@medusajs/framework/utils"
import PurchaseDepartmentModuleService from "./service"

export const PURCHASE_DEPARTMENT_MODULE = "purchaseDepartment"

export default Module(PURCHASE_DEPARTMENT_MODULE, {
  service: PurchaseDepartmentModuleService,
})
