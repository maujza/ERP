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
  email: "staff@aurelia.com",
  token: "tok_abc123",
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("inviteCreatedHandler", () => {
  describe("happy path", () => {
    it("calls createNotifications once when invite is found", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      expect(createNotifications).toHaveBeenCalledTimes(1)
    })

    it("sends to the invite email address", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      await run(container)
      expect(createNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ to: "staff@aurelia.com" })
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
    it("propagates errors thrown by createNotifications", async () => {
      const { container, createNotifications } = makeContainer({ invite: validInvite })
      createNotifications.mockRejectedValueOnce(new Error("SendGrid unavailable"))
      await expect(run(container)).rejects.toThrow("SendGrid unavailable")
    })

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
