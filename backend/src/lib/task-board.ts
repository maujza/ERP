export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_AREAS = [
  "operations",
  "purchasing",
  "inventory",
  "catalog",
  "customers",
  "marketing",
] as const
export type TaskArea = (typeof TASK_AREAS)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Por hacer",
  in_progress: "En curso",
  blocked: "Bloqueada",
  done: "Hecha",
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
}

export const TASK_AREA_LABELS: Record<TaskArea, string> = {
  operations: "Operaciones",
  purchasing: "Compras",
  inventory: "Stock",
  catalog: "Catálogo",
  customers: "Clientes",
  marketing: "Marketing",
}

