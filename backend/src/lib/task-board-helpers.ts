import TaskBoardModuleService from "../modules/taskBoard/service"
import { type TaskStatus } from "./task-board"

/**
 * Converts a nullable/optional ISO date string to a Date, null, or undefined.
 * - undefined input → undefined (field not in the update payload)
 * - null input → null (clear the date)
 * - string input → parsed Date
 */
export function normalizeDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value)
}

/**
 * Returns the next available position for a task in the given status column.
 * Positions are 0-based and gapless within a column.
 */
export async function getNextPosition(
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
