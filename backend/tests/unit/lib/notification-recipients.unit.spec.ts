import {
  getRecipientsByRole,
  clearRecipientsCache,
} from "../../../src/lib/notification-recipients"

// ─── helpers ──────────────────────────────────────────────────────────────────

type UserRow = { id: string; metadata?: Record<string, unknown> }

function makeContainer(users: UserRow[]) {
  return {
    resolve: jest.fn((_key: string) => ({
      graph: jest.fn().mockResolvedValue({ data: users }),
    })),
  }
}

// ─── cache isolation ──────────────────────────────────────────────────────────

beforeEach(() => {
  clearRecipientsCache()
})

// ─── happy path ───────────────────────────────────────────────────────────────

describe("getRecipientsByRole", () => {
  it("returns ids of users whose metadata.role matches the requested role", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "admin" } },
      { id: "u_02", metadata: { role: "viewer" } },
      { id: "u_03", metadata: { role: "admin" } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual(expect.arrayContaining(["u_01", "u_03"]))
    expect(ids).not.toContain("u_02")
  })

  it("matches multiple roles in a single call", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "admin" } },
      { id: "u_02", metadata: { role: "manager" } },
      { id: "u_03", metadata: { role: "viewer" } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin", "manager"])

    expect(ids).toEqual(expect.arrayContaining(["u_01", "u_02"]))
    expect(ids).not.toContain("u_03")
  })

  it("returns an empty array when no users match", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "viewer" } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual([])
  })

  it("returns an empty array when there are no users at all", async () => {
    const container = makeContainer([])

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual([])
  })

  it("excludes users with no metadata", async () => {
    const users: UserRow[] = [
      { id: "u_01" },
      { id: "u_02", metadata: { role: "admin" } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual(["u_02"])
  })

  it("excludes users with metadata but no role key", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { other: "value" } },
      { id: "u_02", metadata: { role: "admin" } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual(["u_02"])
  })

  it("is case-insensitive: matches lowercase role against uppercase metadata.role", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "ADMIN" } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toContain("u_01")
  })

  it("trims whitespace from metadata.role values", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "  admin  " } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toContain("u_01")
  })

  it("ignores metadata.role when its value is not a string (number)", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: 42 } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual([])
  })

  it("ignores metadata.role when its value is null", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: null } },
    ]
    const container = makeContainer(users)

    const ids = await getRecipientsByRole(container, ["admin"])

    expect(ids).toEqual([])
  })
})

// ─── caching behaviour ────────────────────────────────────────────────────────

describe("getRecipientsByRole — caching", () => {
  it("calls query.graph only once for the same role set within the TTL", async () => {
    const users: UserRow[] = [{ id: "u_01", metadata: { role: "admin" } }]

    let callCount = 0
    const container = {
      resolve: jest.fn((_key: string) => ({
        graph: jest.fn().mockImplementation(async () => {
          callCount++
          return { data: users }
        }),
      })),
    }

    await getRecipientsByRole(container, ["admin"])
    await getRecipientsByRole(container, ["admin"])

    // Second call should hit the cache — only 1 query should have been made
    expect(callCount).toBe(1)
  })

  it("re-queries after clearRecipientsCache() is called", async () => {
    const users: UserRow[] = [{ id: "u_01", metadata: { role: "admin" } }]

    // Use a fresh container with a trackable graph mock
    let callCount = 0
    const container = {
      resolve: jest.fn((_key: string) => ({
        graph: jest.fn().mockImplementation(async () => {
          callCount++
          return { data: users }
        }),
      })),
    }

    await getRecipientsByRole(container, ["admin"])
    clearRecipientsCache()
    await getRecipientsByRole(container, ["admin"])

    expect(callCount).toBe(2)
  })

  it("caches different role sets independently", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "admin" } },
      { id: "u_02", metadata: { role: "manager" } },
    ]

    let callCount = 0
    const container = {
      resolve: jest.fn((_key: string) => ({
        graph: jest.fn().mockImplementation(async () => {
          callCount++
          return { data: users }
        }),
      })),
    }

    await getRecipientsByRole(container, ["admin"])
    await getRecipientsByRole(container, ["manager"])
    // Both role sets are distinct cache keys — should trigger 2 queries
    expect(callCount).toBe(2)
  })

  it("uses same cache entry regardless of role array order", async () => {
    const users: UserRow[] = [
      { id: "u_01", metadata: { role: "admin" } },
      { id: "u_02", metadata: { role: "manager" } },
    ]

    let callCount = 0
    const container = {
      resolve: jest.fn((_key: string) => ({
        graph: jest.fn().mockImplementation(async () => {
          callCount++
          return { data: users }
        }),
      })),
    }

    await getRecipientsByRole(container, ["admin", "manager"])
    await getRecipientsByRole(container, ["manager", "admin"]) // same roles, different order
    // Cache key is sorted, so both should hit the same cache entry
    expect(callCount).toBe(1)
  })
})
