import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

import { ensureAdminRole } from "../../src/lib/ensure-admin-role"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  dbName: "medusa-admin-role-integration",
  testSuite: ({ getContainer }) => {
    describe("admin role assignment - integration", () => {
      it("persists role=admin through the real user module and remains idempotent", async () => {
        const container = getContainer()
        const userModule = container.resolve<any>(Modules.USER)
        const logger = { info: jest.fn(), warn: jest.fn() }
        const email = "admin-role-integration@test.com"

        const created = await userModule.createUsers({
          email,
          metadata: { locale: "es" },
        })

        await expect(ensureAdminRole(container as any, logger, email)).resolves.toBe(true)
        await expect(ensureAdminRole(container as any, logger, email)).resolves.toBe(true)

        const [updated] = await userModule.listUsers({ id: created.id })
        expect(updated.metadata).toEqual(
          expect.objectContaining({
            locale: "es",
            role: "admin",
          })
        )
      })
    })
  },
})
