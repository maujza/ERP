import { GET, POST } from "../../../../../src/api/admin/team-tasks/route"
import {
  GET as GET_ID,
  POST as POST_ID,
  DELETE as DELETE_ID,
} from "../../../../../src/api/admin/team-tasks/[id]/route"

const TASK_BOARD_MODULE = "taskBoard"

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task_01",
    title: "Test task",
    description: null,
    status: "todo",
    priority: "medium",
    area: "operations",
    assignee: null,
    due_date: null,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeService(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    listAndCountTasks: jest.fn().mockResolvedValue([[], 0]),
    listTasks: jest.fn().mockResolvedValue([]),
    createTasks: jest.fn().mockResolvedValue(makeTask()),
    retrieveTask: jest.fn().mockResolvedValue(makeTask()),
    updateTasks: jest.fn().mockResolvedValue(makeTask()),
    deleteTasks: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeReq(
  {
    service,
    body = {},
    params = {},
    queryConfig = {},
  }: {
    service?: ReturnType<typeof makeService>
    body?: Record<string, unknown>
    params?: Record<string, string>
    queryConfig?: Record<string, unknown>
  } = {}
) {
  const svc = service ?? makeService()
  return {
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === TASK_BOARD_MODULE) return svc
        throw new Error(`Unknown service: ${key}`)
      }),
    },
    validatedBody: body,
    params,
    queryConfig: { pagination: { take: 20, skip: 0 }, ...queryConfig },
    _service: svc,
  } as unknown as ReturnType<typeof makeReq>
}

function makeRes() {
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  }
  return res as unknown as ReturnType<typeof makeRes>
}

// ─── GET /admin/team-tasks ────────────────────────────────────────────────────

describe("GET /admin/team-tasks", () => {
  it("returns tasks and count", async () => {
    const task = makeTask()
    const svc = makeService({ listAndCountTasks: jest.fn().mockResolvedValue([[task], 1]) })
    const req = makeReq({ service: svc })
    const res = makeRes()

    await GET(req as never, res as never)

    expect(svc.listAndCountTasks).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ take: 20, skip: 0 })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ tasks: [task], count: 1 })
    )
  })

  it("defaults pagination when queryConfig is absent", async () => {
    const svc = makeService()
    const req = makeReq({ service: svc, queryConfig: {} })
    const res = makeRes()
    await GET(req as never, res as never)
    expect(svc.listAndCountTasks).toHaveBeenCalled()
  })
})

// ─── POST /admin/team-tasks ───────────────────────────────────────────────────

describe("POST /admin/team-tasks", () => {
  it("creates a task with defaults filled in", async () => {
    const task = makeTask({ title: "New task", status: "todo" })
    const svc = makeService({
      listTasks: jest.fn().mockResolvedValue([]),
      createTasks: jest.fn().mockResolvedValue(task),
    })
    const req = makeReq({ service: svc, body: { title: "New task" } })
    const res = makeRes()

    await POST(req as never, res as never)

    expect(svc.createTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New task",
        status: "todo",
        priority: "medium",
        area: "operations",
        position: 0,
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ task })
  })

  it("uses provided status and explicit position without querying DB", async () => {
    const svc = makeService()
    const req = makeReq({
      service: svc,
      body: { title: "Urgent task", status: "in_progress", position: 3, priority: "high" },
    })
    const res = makeRes()

    await POST(req as never, res as never)

    expect(svc.listTasks).not.toHaveBeenCalled()
    expect(svc.createTasks).toHaveBeenCalledWith(
      expect.objectContaining({ status: "in_progress", position: 3, priority: "high" })
    )
  })

  it("trims whitespace from title and assignee", async () => {
    const svc = makeService()
    const req = makeReq({
      service: svc,
      body: { title: "  Trimmed  ", assignee: "  juan  " },
    })
    const res = makeRes()

    await POST(req as never, res as never)

    expect(svc.createTasks).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Trimmed", assignee: "juan" })
    )
  })
})

// ─── GET /admin/team-tasks/:id ────────────────────────────────────────────────

describe("GET /admin/team-tasks/:id", () => {
  it("returns the task when found", async () => {
    const task = makeTask({ id: "task_99" })
    const svc = makeService({ retrieveTask: jest.fn().mockResolvedValue(task) })
    const req = makeReq({ service: svc, params: { id: "task_99" } })
    const res = makeRes()

    await GET_ID(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({ task })
  })

  it("throws NOT_FOUND when task does not exist", async () => {
    const svc = makeService({ retrieveTask: jest.fn().mockRejectedValue(new Error("not found")) })
    const req = makeReq({ service: svc, params: { id: "missing" } })
    const res = makeRes()

    await expect(GET_ID(req as never, res as never)).rejects.toThrow("Task not found")
  })
})

// ─── POST /admin/team-tasks/:id ───────────────────────────────────────────────

describe("POST /admin/team-tasks/:id (update)", () => {
  it("updates a task and returns it", async () => {
    const existing = makeTask({ id: "task_01", status: "todo" })
    const updated = makeTask({ id: "task_01", title: "Updated", status: "todo" })
    const svc = makeService({
      retrieveTask: jest.fn().mockResolvedValue(existing),
      updateTasks: jest.fn().mockResolvedValue(updated),
    })
    const req = makeReq({ service: svc, params: { id: "task_01" }, body: { title: "Updated" } })
    const res = makeRes()

    await POST_ID(req as never, res as never)

    expect(svc.updateTasks).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task_01", title: "Updated" })
    )
    expect(res.json).toHaveBeenCalledWith({ task: updated })
  })

  it("recalculates position when status changes", async () => {
    const existing = makeTask({ status: "todo", position: 1 })
    const svc = makeService({
      retrieveTask: jest.fn().mockResolvedValue(existing),
      listTasks: jest.fn().mockResolvedValue([makeTask({ status: "in_progress", position: 0 })]),
      updateTasks: jest.fn().mockResolvedValue(existing),
    })
    const req = makeReq({ service: svc, params: { id: "task_01" }, body: { status: "in_progress" } })
    const res = makeRes()

    await POST_ID(req as never, res as never)

    expect(svc.listTasks).toHaveBeenCalledWith({ status: "in_progress" })
    expect(svc.updateTasks).toHaveBeenCalledWith(
      expect.objectContaining({ position: 1 })
    )
  })

  it("throws NOT_FOUND when task does not exist", async () => {
    const svc = makeService({ retrieveTask: jest.fn().mockRejectedValue(new Error()) })
    const req = makeReq({ service: svc, params: { id: "missing" }, body: { title: "x" } })
    const res = makeRes()

    await expect(POST_ID(req as never, res as never)).rejects.toThrow("Task not found")
  })
})

// ─── DELETE /admin/team-tasks/:id ─────────────────────────────────────────────

describe("DELETE /admin/team-tasks/:id", () => {
  it("deletes the task and returns a tombstone", async () => {
    const svc = makeService()
    const req = makeReq({ service: svc, params: { id: "task_01" } })
    const res = makeRes()

    await DELETE_ID(req as never, res as never)

    expect(svc.deleteTasks).toHaveBeenCalledWith("task_01")
    expect(res.json).toHaveBeenCalledWith({ id: "task_01", object: "task", deleted: true })
  })
})
