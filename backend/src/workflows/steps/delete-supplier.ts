import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PURCHASE_DEPARTMENT_MODULE } from "../../modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../modules/purchaseDepartment/service"

type Input = { id: string }

export const deleteSupplierStep = createStep(
  "delete-supplier",
  async (input: Input, { container }) => {
    const purchaseService = container.resolve<PurchaseDepartmentModuleService>(
      PURCHASE_DEPARTMENT_MODULE
    )

    await purchaseService.deleteSuppliers(input.id)

    return new StepResponse({ id: input.id })
  }
)
