import { model } from "@medusajs/framework/utils"
import {
  TASK_AREAS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../../../lib/task-board"

const Task = model.define("task_board_task", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  status: model.enum([...TASK_STATUSES]).default("todo"),
  priority: model.enum([...TASK_PRIORITIES]).default("medium"),
  area: model.enum([...TASK_AREAS]).default("operations"),
  assignee: model.text().nullable(),
  due_date: model.dateTime().nullable(),
  position: model.number().default(0),
})

export default Task

