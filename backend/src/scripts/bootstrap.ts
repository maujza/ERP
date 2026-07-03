import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { ensureAdminRole } from "../lib/ensure-admin-role"
import seedAuroraData from "./seed-aurora"
import seedDemoData from "./seed"

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
    logger.info("Argentina region not found. Running Aurora seed...")
    await seedAuroraData({ container, args: [] })
  } else {
    logger.info("Aurora regional seed already present. Skipping Aurora seed.")
  }

  try {
    await ensureAdminRole(container, logger)
  } catch (err: any) {
    logger.warn(`Could not set admin role: ${err?.message}`)
  }
}
