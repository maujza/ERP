import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
}

export const createSupplierStep = createStep(
  "create-supplier",
  async (input: Input, { container }) => {
    const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
      PURCHASE_DEPARTMENT_MODULE
    )

    const supplier = await purchaseService.createSuppliers(input)

    return new StepResponse(supplier, supplier.id)
  },
  async (supplierId: string, { container }) => {
    const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
      PURCHASE_DEPARTMENT_MODULE
    )
    await purchaseService.deleteSuppliers(supplierId)
  }
)
