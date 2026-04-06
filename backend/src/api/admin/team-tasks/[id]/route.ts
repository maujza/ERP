import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { type TaskStatus } from "../../../../lib/task-board"
import { TASK_BOARD_MODULE } from "../../../../modules/taskBoard"
import TaskBoardModuleService from "../../../../modules/taskBoard/service"
import { type UpdateTaskSchema } from "../../../middlewares"

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
  const task = await taskBoardService.retrieveTask(req.params.id).catch(() => null)

  if (!task) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Task not found")
  }

  res.json({ task })
}

export async function POST(
  req: AuthenticatedMedusaRequest<UpdateTaskSchema>,
  res: MedusaResponse
) {
  const taskBoardService = req.scope.resolve<TaskBoardModuleService>(TASK_BOARD_MODULE)
  const existing = await taskBoardService.retrieveTask(req.params.id).catch(() => null)

  if (!existing) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Task not found")
  }

  const nextStatus = req.validatedBody.status ?? existing.status
  const position =
    req.validatedBody.position ??
    (nextStatus !== existing.status
      ? await getNextPosition(taskBoardService, nextStatus as TaskStatus)
      : existing.position)

  const payload: Record<string, unknown> = {
    id: req.params.id,
    position,
  }

  if (req.validatedBody.title !== undefined) payload.title = req.validatedBody.title.trim()
  if (req.validatedBody.description !== undefined) {
    payload.description = req.validatedBody.description?.trim() || null
  }
  if (req.validatedBody.status !== undefined) payload.status = req.validatedBody.status
  if (req.validatedBody.priority !== undefined) payload.priority = req.validatedBody.priority
  if (req.validatedBody.area !== undefined) payload.area = req.validatedBody.area
  if (req.validatedBody.assignee !== undefined) {
    payload.assignee = req.validatedBody.assignee?.trim() || null
  }
  if (req.validatedBody.due_date !== undefined) {
    payload.due_date = normalizeDate(req.validatedBody.due_date)
  }

  const task = await taskBoardService.updateTasks(payload)

  res.json({ task })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const taskBoardService = req.scope.resolve<TaskBoardModuleService>(TASK_BOARD_MODULE)
  await taskBoardService.deleteTasks(req.params.id)

  res.json({ id: req.params.id, object: "task", deleted: true })
}

