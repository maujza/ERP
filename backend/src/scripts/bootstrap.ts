import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import seedAureliaData from "./seed-aurelia"
import seedDemoData from "./seed"

async function ensureInitialAdminRole(container: ExecArgs["container"]) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const userModule = container.resolve(Modules.USER) as {
    listUsers: (filters: { email: string }) => Promise<Array<{ id: string; metadata?: { role?: string } | null }>>
    updateUsers: (input: Array<{ id: string; metadata: { role: string } }>) => Promise<unknown>
  }

  const adminEmail = process.env.MEDUSA_ADMIN_EMAIL || "admin@aurelia.com"
  const [adminUser] = await userModule.listUsers({ email: adminEmail })

  if (!adminUser) {
    logger.warn(`Admin user ${adminEmail} not found — skipping role assignment`)
    return
  }

  if (adminUser.metadata?.role === "admin") {
    logger.info(`${adminEmail} already has role=admin`)
    return
  }

  await userModule.updateUsers([{ id: adminUser.id, metadata: { role: "admin" } }])
  logger.info(`Set metadata.role=admin on ${adminEmail}`)
}

export default async function bootstrap({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!defaultSalesChannel) {
    logger.info("Default sales channel not found. Running base seed...")
    await seedDemoData({ container, args: [] })
  } else {
    logger.info("Base seed already present. Skipping default seed.")
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
  })

  const hasArgentinaRegion = regions.some(
    (region: { currency_code?: string }) => region.currency_code === "ars"
  )

  if (!hasArgentinaRegion) {
    logger.info("Argentina region not found. Running Aurelia seed...")
    await seedAureliaData({ container, args: [] })
  } else {
    logger.info("Aurelia regional seed already present. Skipping Aurelia seed.")
  }

  try {
    await ensureInitialAdminRole(container)
  } catch (err: any) {
    logger.warn(`Could not set admin role: ${err?.message}`)
  }
}
