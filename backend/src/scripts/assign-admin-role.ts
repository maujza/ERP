import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ensureAdminRole } from "../lib/ensure-admin-role"

export default async function assignAdminRole({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const assigned = await ensureAdminRole(container, logger)

  if (!assigned) {
    throw new Error("Admin user must exist before assigning the admin role")
  }
}
