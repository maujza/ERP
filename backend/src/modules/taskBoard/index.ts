import { Module } from "@medusajs/framework/utils"
import TaskBoardModuleService from "./service"

export const TASK_BOARD_MODULE = "taskBoard"

export default Module(TASK_BOARD_MODULE, {
  service: TaskBoardModuleService,
})

