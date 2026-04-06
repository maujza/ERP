import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TASK_BOARD_MODULE } from "../../../modules/taskBoard"
import TaskBoardModuleService from "../../../modules/taskBoard/service"
import { type CreateTaskSchema } from "../../middlewares"
import { type TaskStatus } from "../../../lib/task-board"

function normalizeDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value)
}

async function getNextPosition(
  taskBoardService: TaskBoardModuleService,
  status: TaskStatus
): Promise<number> {
  const tasks = await taskBoardService.listTasks({ status })
  const maxPosition = tasks.reduce((max, task) => {
    const current = typeof task.position === "number" ? task.position : 0
    return Math.max(max, current)
  }, -1)

  return maxPosition + 1
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const taskBoardService = req.scope.resolve<TaskBoardModuleService>(TASK_BOARD_MODULE)

  const [tasks, count] = await taskBoardService.listAndCountTasks(
    {},
    {
      take: req.queryConfig?.pagination?.take ?? 200,
      skip: req.queryConfig?.pagination?.skip ?? 0,
      order: {
        status: "ASC",
        position: "ASC",
        created_at: "DESC",
      },
    }
  )

  res.json({
    tasks,
    count,
    limit: req.queryConfig?.pagination?.take ?? 200,
    offset: req.queryConfig?.pagination?.skip ?? 0,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreateTaskSchema>,
  res: MedusaResponse
) {
  const taskBoardService = req.scope.resolve<TaskBoardModuleService>(TASK_BOARD_MODULE)
  const status = req.validatedBody.status ?? "todo"
  const position =
    req.validatedBody.position ?? (await getNextPosition(taskBoardService, status))

  const task = await taskBoardService.createTasks({
    title: req.validatedBody.title.trim(),
    description: req.validatedBody.description?.trim() || null,
    status,
    priority: req.validatedBody.priority ?? "medium",
    area: req.validatedBody.area ?? "operations",
    assignee: req.validatedBody.assignee?.trim() || null,
    due_date: normalizeDate(req.validatedBody.due_date),
    position,
  })

  res.status(201).json({ task })
}

