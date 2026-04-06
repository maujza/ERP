"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EllipsisHorizontal, Plus, Users } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  DropdownMenu,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { DragEvent } from "react"
import { useState } from "react"
import { sdk } from "../../lib/client"
import {
  TASK_AREAS,
  TASK_AREA_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskArea,
  type TaskPriority,
  type TaskStatus,
} from "../../../lib/task-board"

export const config = defineRouteConfig({
  label: "Tareas",
  icon: Users,
})

type TeamTask = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  area: TaskArea
  assignee: string | null
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
}

type TaskForm = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  area: TaskArea
  assignee: string
  due_date: string
}

const initialForm: TaskForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  area: "operations",
  assignee: "",
  due_date: "",
}

const priorityBadgeColor: Record<TaskPriority, "grey" | "blue" | "orange" | "red"> = {
  low: "grey",
  medium: "blue",
  high: "orange",
  urgent: "red",
}

function normalizeDateForInput(value: string | null): string {
  if (!value) return ""
  return value.slice(0, 10)
}

function formatDueDate(value: string | null): string {
  if (!value) return "Sin fecha"
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })
}

function buildPayload(form: TaskForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    area: form.area,
    assignee: form.assignee.trim() || null,
    due_date: form.due_date ? new Date(`${form.due_date}T12:00:00`).toISOString() : null,
  }
}

function TaskModal({
  open,
  title,
  form,
  onOpenChange,
  onChange,
  onSubmit,
  submitting,
}: {
  open: boolean
  title: string
  form: TaskForm
  onOpenChange: (open: boolean) => void
  onChange: (patch: Partial<TaskForm>) => void
  onSubmit: () => void
  submitting: boolean
}) {
  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex w-full items-center justify-between">
            <Heading>{title}</Heading>
            <Button size="small" onClick={onSubmit} isLoading={submitting}>
              Guardar
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="Ej. Reponer surtido de acero"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Responsable</Label>
                <Input
                  value={form.assignee}
                  onChange={(e) => onChange({ assignee: e.target.value })}
                  placeholder="Ej. Agus"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(value) => onChange({ status: value as TaskStatus })}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {TASK_STATUSES.map((status) => (
                      <Select.Item key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prioridad</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => onChange({ priority: value as TaskPriority })}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {TASK_PRIORITIES.map((priority) => (
                      <Select.Item key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Área</Label>
                <Select value={form.area} onValueChange={(value) => onChange({ area: value as TaskArea })}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {TASK_AREAS.map((area) => (
                      <Select.Item key={area} value={area}>
                        {TASK_AREA_LABELS[area]}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Vencimiento</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => onChange({ due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Descripción</Label>
              <textarea
                value={form.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Contexto, siguiente acción o bloqueo"
                className="min-h-32 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm outline-none transition-colors focus:border-ui-border-interactive"
              />
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
}: {
  task: TeamTask
  onEdit: (task: TeamTask) => void
  onDelete: (task: TeamTask) => void
  onMove: (task: TeamTask, status: TaskStatus) => void
  onDragStart: (event: DragEvent<HTMLDivElement>, taskId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-card-rest transition hover:border-ui-border-interactive"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text weight="plus" className="line-clamp-2">
            {task.title}
          </Text>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge color={priorityBadgeColor[task.priority]} size="2xsmall">
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge size="2xsmall">{TASK_AREA_LABELS[task.area]}</Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton size="small" variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={() => onEdit(task)}>Editar</DropdownMenu.Item>
            {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
              <DropdownMenu.Item key={status} onClick={() => onMove(task, status)}>
                Mover a {TASK_STATUS_LABELS[status]}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator />
            <Prompt>
              <Prompt.Trigger asChild>
                <DropdownMenu.Item onSelect={(event) => event.preventDefault()}>
                  Eliminar
                </DropdownMenu.Item>
              </Prompt.Trigger>
              <Prompt.Content>
                <Prompt.Header>
                  <Prompt.Title>Eliminar tarea</Prompt.Title>
                  <Prompt.Description>
                    Se va a eliminar <strong>{task.title}</strong>. Esta acción no se puede deshacer.
                  </Prompt.Description>
                </Prompt.Header>
                <Prompt.Footer>
                  <Prompt.Cancel>Cancelar</Prompt.Cancel>
                  <Prompt.Action onClick={() => onDelete(task)}>Eliminar</Prompt.Action>
                </Prompt.Footer>
              </Prompt.Content>
            </Prompt>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      {task.description && (
        <Text size="small" className="mb-4 line-clamp-4 text-ui-fg-subtle">
          {task.description}
        </Text>
      )}

      <div className="flex flex-col gap-2 text-ui-fg-subtle">
        <div className="flex items-center justify-between gap-2">
          <Text size="xsmall">Responsable</Text>
          <Text size="small">{task.assignee || "Sin asignar"}</Text>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Text size="xsmall">Vence</Text>
          <Text size="small">{formatDueDate(task.due_date)}</Text>
        </div>
      </div>
    </div>
  )
}

export default function TeamTasksPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<TeamTask | null>(null)
  const [createForm, setCreateForm] = useState<TaskForm>(initialForm)
  const [editForm, setEditForm] = useState<TaskForm>(initialForm)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["team-tasks"],
    queryFn: () =>
      sdk.client.fetch<{ tasks: TeamTask[]; count: number }>("/admin/team-tasks", {
        query: { limit: 200 },
      }),
  })

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof buildPayload>) =>
      sdk.client.fetch("/admin/team-tasks", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] })
      toast.success("Tarea creada")
      setCreateOpen(false)
      setCreateForm(initialForm)
    },
    onError: () => toast.error("No se pudo crear la tarea"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      sdk.client.fetch(`/admin/team-tasks/${id}`, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] })
      toast.success("Tarea actualizada")
      setEditTask(null)
    },
    onError: () => toast.error("No se pudo actualizar la tarea"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/team-tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks"] })
      toast.success("Tarea eliminada")
    },
    onError: () => toast.error("No se pudo eliminar la tarea"),
  })

  const tasks = data?.tasks ?? []
  const columns = TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks
      .filter((task) => task.status === status)
      .sort((left, right) => left.position - right.position),
  }))

  const openEdit = (task: TeamTask) => {
    setEditForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      area: task.area,
      assignee: task.assignee || "",
      due_date: normalizeDateForInput(task.due_date),
    })
    setEditTask(task)
  }

  const handleCreate = () => {
    if (!createForm.title.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    createMutation.mutate(buildPayload(createForm))
  }

  const handleUpdate = () => {
    if (!editTask) return
    if (!editForm.title.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    updateMutation.mutate({
      id: editTask.id,
      ...buildPayload(editForm),
    })
  }

  const moveTask = (task: TeamTask, status: TaskStatus) => {
    if (task.status === status) return
    updateMutation.mutate({ id: task.id, status })
  }

  const handleDragStart = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", taskId)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData("text/plain")
    const task = tasks.find((entry) => entry.id === taskId)
    if (!task || task.status === status) return
    moveTask(task, status)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Heading level="h1">Tablero de tareas</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Seguimiento operativo para compras, stock, catálogo, clientes y marketing.
          </Text>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Nueva tarea
        </Button>
      </div>

      {isLoading && (
        <Container className="py-12 text-center">
          <Text size="small" className="text-ui-fg-muted">
            Cargando tablero...
          </Text>
        </Container>
      )}

      {isError && (
        <Container className="py-12 text-center">
          <Text size="small" className="text-ui-fg-muted">
            No se pudo cargar el tablero.
          </Text>
        </Container>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => (
            <Container
              key={column.status}
              className="flex min-h-[520px] flex-col gap-4 bg-ui-bg-subtle/60"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Heading level="h2">{TASK_STATUS_LABELS[column.status]}</Heading>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {column.tasks.length} tareas
                  </Text>
                </div>
                <Badge>{column.tasks.length}</Badge>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {column.tasks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-ui-border-base px-4 py-6 text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      Soltá una tarea acá o creá una nueva.
                    </Text>
                  </div>
                )}
                {column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={openEdit}
                    onDelete={(entry) => deleteMutation.mutate(entry.id)}
                    onMove={moveTask}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </Container>
          ))}
        </div>
      )}

      <TaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nueva tarea"
        form={createForm}
        onChange={(patch) => setCreateForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleCreate}
        submitting={createMutation.isPending}
      />

      <TaskModal
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null)
        }}
        title="Editar tarea"
        form={editForm}
        onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
        onSubmit={handleUpdate}
        submitting={updateMutation.isPending}
      />
    </div>
  )
}
