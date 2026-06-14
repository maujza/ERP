import { ensureAdminRole } from "../../../src/lib/ensure-admin-role"

describe("ensureAdminRole", () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns false without updating when the admin user does not exist", async () => {
    const userModule = {
      listUsers: jest.fn().mockResolvedValue([]),
      updateUsers: jest.fn(),
    }
    const container = { resolve: jest.fn().mockReturnValue(userModule) }

    await expect(ensureAdminRole(container, logger, "admin@test.com")).resolves.toBe(false)
    expect(userModule.listUsers).toHaveBeenCalledWith({ email: "admin@test.com" })
    expect(userModule.updateUsers).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Admin user admin@test.com not found - skipping role assignment"
    )
  })

  it("assigns admin while preserving existing metadata", async () => {
    const userModule = {
      listUsers: jest.fn().mockResolvedValue([
        {
          id: "user_123",
          metadata: { locale: "es", role: "inventory" },
        },
      ]),
      updateUsers: jest.fn().mockResolvedValue(undefined),
    }
    const container = { resolve: jest.fn().mockReturnValue(userModule) }

    await expect(ensureAdminRole(container, logger, "admin@test.com")).resolves.toBe(true)
    expect(userModule.updateUsers).toHaveBeenCalledWith([
      {
        id: "user_123",
        metadata: { locale: "es", role: "admin" },
      },
    ])
    expect(logger.info).toHaveBeenCalledWith("Set metadata.role=admin on admin@test.com")
  })

  it("is idempotent when the user is already an admin", async () => {
    const userModule = {
      listUsers: jest.fn().mockResolvedValue([
        {
          id: "user_123",
          metadata: { role: "admin" },
        },
      ]),
      updateUsers: jest.fn(),
    }
    const container = { resolve: jest.fn().mockReturnValue(userModule) }

    await expect(ensureAdminRole(container, logger, "admin@test.com")).resolves.toBe(true)
    expect(userModule.updateUsers).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith("admin@test.com already has role=admin")
  })
})
