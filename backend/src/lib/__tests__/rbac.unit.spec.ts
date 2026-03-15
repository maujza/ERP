import { ROLES, getRoleFromMetadata, getUserRole, requireRole } from "../rbac"

// ─── getRoleFromMetadata ──────────────────────────────────────────────────────

describe("getRoleFromMetadata", () => {
  it("returns the role for a valid lowercase string", () => {
    expect(getRoleFromMetadata({ role: "purchasing" })).toBe("purchasing")
  })

  it("normalizes mixed-case role values", () => {
    expect(getRoleFromMetadata({ role: "ADMIN" })).toBe("admin")
    expect(getRoleFromMetadata({ role: "Purchasing" })).toBe("purchasing")
  })

  it("trims whitespace from role values", () => {
    expect(getRoleFromMetadata({ role: "  admin  " })).toBe("admin")
  })

  it("returns null for an unrecognised role string", () => {
    expect(getRoleFromMetadata({ role: "superuser" })).toBeNull()
  })

  it("returns null when metadata is undefined", () => {
    expect(getRoleFromMetadata(undefined)).toBeNull()
  })

  it("returns null when role key is missing", () => {
    expect(getRoleFromMetadata({ other: "value" })).toBeNull()
  })

  it("returns null when role is a number (wrong type)", () => {
    expect(getRoleFromMetadata({ role: 42 })).toBeNull()
  })

  it("returns null when role is an array (wrong type)", () => {
    expect(getRoleFromMetadata({ role: ["admin"] })).toBeNull()
  })

  it("returns null when role is an empty string", () => {
    expect(getRoleFromMetadata({ role: "" })).toBeNull()
  })

  it("recognises all defined roles", () => {
    for (const role of Object.values(ROLES)) {
      expect(getRoleFromMetadata({ role })).toBe(role)
    }
  })
})

// ─── getUserRole ──────────────────────────────────────────────────────────────

function makeScope(userData: { metadata?: Record<string, unknown> } | null = {}) {
  return {
    resolve: (_key: string) => ({
      graph: async (_input: unknown) => ({
        data: userData === null ? [] : [userData],
      }),
    }),
  }
}

function makeThrowingScope() {
  return {
    resolve: (_key: string) => ({
      graph: async (_input: unknown) => {
        throw new Error("DB connection lost")
      },
    }),
  }
}

describe("getUserRole", () => {
  it("returns the role when user has valid metadata.role", async () => {
    const scope = makeScope({ metadata: { role: "purchasing" } })
    expect(await getUserRole("user_01", scope)).toBe("purchasing")
  })

  it("returns null when user has no metadata", async () => {
    const scope = makeScope({})
    expect(await getUserRole("user_01", scope)).toBeNull()
  })

  it("returns null when user record is not found", async () => {
    const scope = makeScope(null)
    expect(await getUserRole("user_missing", scope)).toBeNull()
  })

  it("returns null (fail safe) when query.graph throws", async () => {
    const scope = makeThrowingScope()
    expect(await getUserRole("user_01", scope)).toBeNull()
  })
})

// ─── requireRole middleware ───────────────────────────────────────────────────

function makeReq(role: string | undefined) {
  const metadata = role !== undefined ? { role } : {}
  return {
    auth_context: { actor_id: "user_01" },
    scope: makeScope({ metadata }),
  } as any
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any
}

describe("requireRole", () => {
  it("calls next() when user has an allowed role", async () => {
    const middleware = requireRole([ROLES.PURCHASING])
    const next = jest.fn()
    await middleware(makeReq("purchasing"), makeRes(), next)
    expect(next).toHaveBeenCalled()
  })

  it("returns 403 when user has a disallowed role", async () => {
    const middleware = requireRole([ROLES.PURCHASING])
    const res = makeRes()
    const next = jest.fn()
    await middleware(makeReq("inventory"), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("returns 403 when user has no role set", async () => {
    const middleware = requireRole([ROLES.PURCHASING])
    const res = makeRes()
    const next = jest.fn()
    await middleware(makeReq(undefined), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("always calls next() for admin role regardless of allowedRoles", async () => {
    const middleware = requireRole([ROLES.PURCHASING])
    const next = jest.fn()
    await middleware(makeReq("admin"), makeRes(), next)
    expect(next).toHaveBeenCalled()
  })

  it("returns 403 (fail safe) when query.graph throws", async () => {
    const middleware = requireRole([ROLES.PURCHASING])
    const res = makeRes()
    const next = jest.fn()
    const req = {
      auth_context: { actor_id: "user_01" },
      scope: makeThrowingScope(),
    } as any
    await middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it("allows multiple roles in the allowedRoles list", async () => {
    const middleware = requireRole([ROLES.PURCHASING, ROLES.INVENTORY])
    const next = jest.fn()
    await middleware(makeReq("inventory"), makeRes(), next)
    expect(next).toHaveBeenCalled()
  })
})
