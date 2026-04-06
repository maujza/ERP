import { MedusaService } from "@medusajs/framework/utils"
import Task from "./models/task"

class TaskBoardModuleService extends MedusaService({
  Task,
}) {}

export default TaskBoardModuleService

