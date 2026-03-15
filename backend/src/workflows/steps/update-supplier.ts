import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = {
  id: string
  name?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
}

export const updateSupplierStep = createStep(
  "update-supplier",
  async (input: Input, { container }) => {
    const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
      PURCHASE_DEPARTMENT_MODULE
    )

    const { id, ...data } = input
    const supplier = await purchaseService.updateSuppliers({ id, ...data })

    return new StepResponse(supplier)
  }
)
