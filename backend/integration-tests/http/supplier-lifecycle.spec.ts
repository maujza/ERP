import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createSupplierWorkflow } from "../../src/workflows/create-supplier"
import {
  updateSupplierWorkflow,
  deleteSupplierWorkflow,
} from "../../src/workflows/update-supplier"
import { PURCHASE_DEPARTMENT_MODULE } from "../../src/modules/purchaseDepartment"
import PurchaseDepartmentModuleService from "../../src/modules/purchaseDepartment/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ getContainer }) => {
    describe("supplier lifecycle workflows — integration", () => {
      // medusaIntegrationTestRunner truncates all tables between each `it()`.
      // Each test resolves the service from a fresh container.

      function getService(container: ReturnType<typeof getContainer>) {
        return container.resolve<PurchaseDepartmentModuleService>(
          PURCHASE_DEPARTMENT_MODULE
        )
      }

      it("creates a supplier and persists its fields", async () => {
        const container = getContainer()
        const purchaseService = getService(container)

        const { result } = await createSupplierWorkflow(container).run({
          input: {
            name: "Acme Gems",
            email: "ventas@acme.test",
            phone: "+54 11 5555 0000",
          },
        })

        expect(result.id).toBeTruthy()
        expect(result.name).toBe("Acme Gems")

        const persisted = await purchaseService.retrieveSupplier(result.id)
        expect(persisted.name).toBe("Acme Gems")
        expect(persisted.email).toBe("ventas@acme.test")
        expect(persisted.phone).toBe("+54 11 5555 0000")
      })

      it("updates an existing supplier's fields", async () => {
        const container = getContainer()
        const purchaseService = getService(container)

        const created = await purchaseService.createSuppliers({
          name: "Original Name",
          email: "old@acme.test",
        })

        const { result } = await updateSupplierWorkflow(container).run({
          input: {
            id: created.id,
            name: "Renamed Supplier",
            email: "new@acme.test",
          },
        })

        expect(result.name).toBe("Renamed Supplier")

        const persisted = await purchaseService.retrieveSupplier(created.id)
        expect(persisted.name).toBe("Renamed Supplier")
        expect(persisted.email).toBe("new@acme.test")
      })

      it("deletes a supplier", async () => {
        const container = getContainer()
        const purchaseService = getService(container)

        const created = await purchaseService.createSuppliers({
          name: "To Be Deleted",
        })

        const { result } = await deleteSupplierWorkflow(container).run({
          input: { id: created.id },
        })

        expect(result.id).toBe(created.id)

        const [, count] = await purchaseService.listAndCountSuppliers({
          id: created.id,
        })
        expect(count).toBe(0)
      })

      it("runs the full create → update → delete lifecycle", async () => {
        const container = getContainer()
        const purchaseService = getService(container)

        const { result: created } = await createSupplierWorkflow(container).run({
          input: { name: "Lifecycle Supplier" },
        })

        await updateSupplierWorkflow(container).run({
          input: { id: created.id, notes: "preferred vendor" },
        })

        const afterUpdate = await purchaseService.retrieveSupplier(created.id)
        expect(afterUpdate.notes).toBe("preferred vendor")

        await deleteSupplierWorkflow(container).run({
          input: { id: created.id },
        })

        const [, count] = await purchaseService.listAndCountSuppliers({
          id: created.id,
        })
        expect(count).toBe(0)
      })
    })
  },
})
