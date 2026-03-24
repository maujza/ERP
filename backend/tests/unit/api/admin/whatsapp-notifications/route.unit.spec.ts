import { GET } from "../../../../../src/api/admin/whatsapp-notifications/route"

// ─── test helpers ────────────────────────────────────────────────────────────

type UserData = { email?: string; metadata?: Record<string, unknown> }

function makeReq(userData: UserData = { email: "user@example.com" }) {
  return {
    auth_context: { actor_id: "user_01" },
    scope: {
      resolve: (_service: string) => ({
        graph: async (_input: unknown) => ({ data: [userData] }),
      }),
    },
  } as any
}

function makeRes() {
  const res = { json: jest.fn() }
  return res as any
}

// capture the value passed to res.json()
function lastJsonArg(res: ReturnType<typeof makeRes>) {
  return res.json.mock.calls[0][0] as Record<string, unknown>
}

// ─── env cleanup ─────────────────────────────────────────────────────────────

const ENV_KEYS = ["WHATSAPP_NOTIFICATION_RECIPIENTS", "WHATSAPP_NOTIFICATION_ROLES"] as const

function clearEnv() {
  ENV_KEYS.forEach((k) => delete process.env[k])
}

beforeEach(clearEnv)
afterEach(clearEnv)

// ─── no RBAC configured ───────────────────────────────────────────────────────

describe("when no RBAC env vars are set", () => {
  it("returns no_rbac_configured: true", async () => {
    const res = makeRes()
    await GET(makeReq(), res)
    expect(lastJsonArg(res).no_rbac_configured).toBe(true)
  })

  it("grants access to every user (can_receive: true)", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "anyone@example.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })
})

// ─── RECIPIENTS only ─────────────────────────────────────────────────────────

describe("when WHATSAPP_NOTIFICATION_RECIPIENTS is set", () => {
  beforeEach(() => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = "admin@example.com,ops@example.com"
  })

  it("allows a user whose email is in the allowlist", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "admin@example.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("denies a user whose email is NOT in the allowlist", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "outsider@example.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(false)
  })

  it("is case-insensitive for email comparison", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "ADMIN@EXAMPLE.COM" }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("trims whitespace around email entries in the env var", async () => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = " admin@example.com , ops@example.com "
    const res = makeRes()
    await GET(makeReq({ email: "admin@example.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("returns no_rbac_configured: false when env var is set", async () => {
    const res = makeRes()
    await GET(makeReq(), res)
    expect(lastJsonArg(res).no_rbac_configured).toBe(false)
  })

  it("includes the user_email in the response (lowercased)", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "Admin@Example.COM" }), res)
    expect(lastJsonArg(res).user_email).toBe("admin@example.com")
  })
})

// ─── ROLES only ──────────────────────────────────────────────────────────────

describe("when WHATSAPP_NOTIFICATION_ROLES is set", () => {
  beforeEach(() => {
    process.env.WHATSAPP_NOTIFICATION_ROLES = "admin,manager"
  })

  it("allows a user whose metadata.role matches", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com", metadata: { role: "admin" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("allows a user whose metadata.role matches another allowed role", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com", metadata: { role: "manager" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("denies a user with no matching role", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com", metadata: { role: "viewer" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(false)
  })

  it("denies a user with no metadata at all", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(false)
  })

  it("is case-insensitive for role comparison", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com", metadata: { role: "ADMIN" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("handles metadata.role with mixed case values", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com", metadata: { role: "MANAGER" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("ignores metadata.role when the value is an unexpected type (number)", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "u@x.com", metadata: { role: 42 } }), res)
    expect(lastJsonArg(res).can_receive).toBe(false)
  })
})

// ─── both RECIPIENTS and ROLES set ──────────────────────────────────────────

describe("when both RECIPIENTS and ROLES are configured", () => {
  beforeEach(() => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = "special@example.com"
    process.env.WHATSAPP_NOTIFICATION_ROLES = "admin"
  })

  it("allows a user that matches email even without a matching role", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "special@example.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("allows a user that matches role even without a matching email", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "other@example.com", metadata: { role: "admin" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("denies a user that matches neither email nor role", async () => {
    const res = makeRes()
    await GET(makeReq({ email: "nobody@example.com", metadata: { role: "viewer" } }), res)
    expect(lastJsonArg(res).can_receive).toBe(false)
  })
})

// ─── user_email edge cases ───────────────────────────────────────────────────

describe("user_email in response", () => {
  it("returns null when the user record has no email", async () => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = "x@example.com"
    const res = makeRes()
    await GET(makeReq({ email: "" }), res)
    expect(lastJsonArg(res).user_email).toBeNull()
  })

  it("returns null when the user record is empty", async () => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = "x@example.com"
    const res = makeRes()
    await GET(makeReq({}), res)
    expect(lastJsonArg(res).user_email).toBeNull()
  })
})

// ─── env var edge cases ───────────────────────────────────────────────────────

describe("edge cases in env var parsing", () => {
  it("ignores empty entries produced by trailing commas", async () => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = "admin@example.com,"
    const res = makeRes()
    await GET(makeReq({ email: "admin@example.com" }), res)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })

  it("treats an all-whitespace env var as not configured (no_rbac_configured: true)", async () => {
    process.env.WHATSAPP_NOTIFICATION_RECIPIENTS = "   "
    process.env.WHATSAPP_NOTIFICATION_ROLES = "   "
    const res = makeRes()
    await GET(makeReq({ email: "admin@example.com" }), res)
    expect(lastJsonArg(res).no_rbac_configured).toBe(true)
    expect(lastJsonArg(res).can_receive).toBe(true)
  })
})
