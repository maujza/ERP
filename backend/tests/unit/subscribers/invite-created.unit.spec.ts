import inviteCreatedHandler from "../../../src/subscribers/invite-created"
import { Modules } from "@medusajs/framework/utils"

// ─── helpers ─────────────────────────────────────────────────────────────────

type InviteRecord = {
  id: string
  email: string
  token: string
}

function makeContainer({
  invite = null as InviteRecord | null,
} = {}) {
  const createNotifications = jest.fn().mockResolvedValue({})
  const warnLogger = jest.fn()

  const container = {
    resolve: jest.fn((key: string) => {
      if (key === "query") {
        return {
          graph: jest.fn(() =>
            Promise.resolve({ data: invite ? [invite] : [] })
          ),
        }
      }
      if (key === Modules.NOTIFICATION) {
        return { createNotifications }
      }
      if (key === "logger") {
        return { warn: warnLogger }
      }
      throw new Error(`Unknown service: ${key}`)
    }),
  }

  return { container, createNotifications, warnLogger }
}

async function run(
  container: ReturnType<typeof makeContainer>["container"],
  inviteId = "invite_01"
) {
  await inviteCreatedHandler({
    event: { data: { id: inviteId } },
    container: container as any,
  } as any)
}

const validInvite: InviteRecord = {
  id: "invite_01",
  email: "staff@aurorapormayor.com",
  token: "tok_abc123",
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("inviteCreatedHandler", () => {
  // Resend is disabled for these tests so the code falls through to the
  // Medusa notification module — which is what the mock verifies.
  let savedResendKey: string | undefined
  let savedResendFrom: string | undefined

  beforeEach(() => {
    savedResendKey = process.env.RESEND_API_KEY
    savedResendFrom = process.env.RESEND_FROM
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM
  })

  afterEach(() => {
    if (savedResendKey !== undefined) process.env.RESEND_API_KEY = savedResendKey
    else delete process.env.RESEND_API_KEY
    if (savedResendFrom !== undefined) process.env.RESEND_FROM = savedResendFrom
    else delete process.env.RESEND_FROM
  })

  describe("notification module fallback (Resend not configured)", () => {
    it("calls createNotifications once when invite is found", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      expect(createNotifications).toHaveBeenCalledTimes(1)
    })

    it("sends to the invite email address", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "staff@aurorapormayor.com" })
      )
    })

    it("uses channel 'email' and template 'invite'", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ channel: "email", template: "invite" })
      )
    })

    it("includes the invite token in the URL", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(call.content.html).toContain("tok_abc123")
    })

    it("email subject is in Spanish", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(call.content.subject).toContain("invitaron")
    })

    it("invite URL contains /app/invite?token=", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      const call = createNotifications.mock.calls[0][0]
      expect(call.content.html).toMatch(/\/app\/invite\?token=/)
    })

    it("propagates errors thrown by createNotifications", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      createNotifications.mockRejectedValueOnce(new Error("SendGrid unavailable"))
      await expect(run(container)).rejects.toThrow("SendGrid unavailable")
    })
  })

  describe("Resend path (RESEND_API_KEY + RESEND_FROM configured)", () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = "re_test_key"
      process.env.RESEND_FROM = "noreply@aurorapormayor.com"
    })

    it("does not call createNotifications when Resend succeeds", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      expect(createNotifications).not.toHaveBeenCalled()
    })

    it("calls Resend API with correct recipient and subject", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any
      const { container } = makeContainer({ invite: validInvite })
      await run(container)
      const [url, opts] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toBe("https://api.resend.com/emails")
      const body = JSON.parse(opts.body)
      expect(body.to).toContain("staff@aurorapormayor.com")
      expect(body.subject).toContain("invitaron")
    })

    it("throws when Resend returns a non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Internal Server Error"),
      }) as any
      const { container } = makeContainer({ invite: validInvite })
      await expect(run(container)).rejects.toThrow("Resend invite email failed")
    })
  })

  describe("when invite is not found", () => {
    it("does not call createNotifications", async () => {
      const { container, createNotifications } = makeContainer({ invite: null })
      await run(container)
      expect(createNotifications).not.toHaveBeenCalled()
    })

    it("logs a warning with the invite ID", async () => {
      const { container, warnLogger } = makeContainer({ invite: null })
      await run(container, "invite_missing")
      expect(warnLogger).toHaveBeenCalledWith(
        expect.stringContaining("invite_missing")
      )
    })
  })

  describe("error handling", () => {
    it("propagates errors thrown by query.graph", async () => {
      const container = {
        resolve: jest.fn(() => ({
          graph: jest.fn().mockRejectedValue(new Error("DB connection failed")),
        })),
      }
      await expect(run(container as any)).rejects.toThrow("DB connection failed")
    })
  })
})
