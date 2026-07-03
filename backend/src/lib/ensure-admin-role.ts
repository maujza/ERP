import { Modules } from "@medusajs/framework/utils"

type AdminUser = {
  id: string
  metadata?: Record<string, unknown> | null
}

type UserModule = {
  listUsers: (filters: { email: string }) => Promise<AdminUser[]>
  updateUsers: (input: Array<{ id: string; metadata: Record<string, unknown> }>) => Promise<unknown>
}

type Container = {
  resolve: (key: string) => UserModule
}

type Logger = {
  info: (message: string) => void
  warn: (message: string) => void
}

export async function ensureAdminRole(
  container: Container,
  logger: Logger,
  adminEmail = process.env.MEDUSA_ADMIN_EMAIL || "admin@aurorapormayor.com"
): Promise<boolean> {
  const userModule = container.resolve(Modules.USER)
  const [adminUser] = await userModule.listUsers({ email: adminEmail })

  if (!adminUser) {
    logger.warn(`Admin user ${adminEmail} not found - skipping role assignment`)
    return false
  }

  if (adminUser.metadata?.role === "admin") {
    logger.info(`${adminEmail} already has role=admin`)
    return true
  }

  await userModule.updateUsers([
    {
      id: adminUser.id,
      metadata: {
        ...(adminUser.metadata ?? {}),
        role: "admin",
      },
    },
  ])
  logger.info(`Set metadata.role=admin on ${adminEmail}`)
  return true
}
