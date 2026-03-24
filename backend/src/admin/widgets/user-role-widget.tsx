import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Select,
  Text,
  Tooltip,
  TooltipProvider,
  toast,
} from "@medusajs/ui"
import type { DetailWidgetProps, AdminUser } from "@medusajs/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/client"
import { ROLES, ROLE_LABELS, type Role } from "../lib/roles"

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS = Object.values(ROLES).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}))

const NO_ROLE_VALUE = "__none__"

// ─── Widget ───────────────────────────────────────────────────────────────────

const UserRoleWidget = ({ data }: DetailWidgetProps<AdminUser>) => {
  const queryClient = useQueryClient()

  const currentRole = (data.metadata?.role as Role | undefined) ?? null
  const [selectedRole, setSelectedRole] = useState<string>(
    currentRole ?? NO_ROLE_VALUE
  )

  // Fetch current logged-in user to guard against self-demotion.
  // Default isSelf to true until the query resolves so the dropdown
  // stays disabled during the initial load and avoids a race window
  // where the user could save before the guard activates.
  const { data: meData } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => sdk.admin.user.me(),
    staleTime: 5 * 60 * 1000, // 5 min — stable across a session
  })

  const isSelf = meData === undefined || meData?.user?.id === data.id

  const mutation = useMutation({
    mutationFn: (role: Role | null) =>
      sdk.admin.user.update(data.id, {
        metadata: { role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", data.id] })
      toast.success("Role updated")
    },
    onError: () => toast.error("Failed to update role"),
  })

  const isDirty =
    selectedRole !== (currentRole ?? NO_ROLE_VALUE) &&
    !mutation.isPending

  const handleSave = () => {
    const role = selectedRole === NO_ROLE_VALUE ? null : (selectedRole as Role)
    mutation.mutate(role)
  }

  return (
    <Container className="px-6 py-4">
      <div className="flex items-start justify-between gap-x-4">
        <div>
          <Heading level="h2" className="mb-1">
            Role
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Controls which admin routes this user can access.
          </Text>
        </div>

        <div className="flex items-center gap-x-2">
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={isSelf || mutation.isPending}
          >
            <Select.Trigger className="w-48">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={NO_ROLE_VALUE}>No role</Select.Item>
              {ROLE_OPTIONS.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <TooltipProvider>
            <Tooltip
              content="You cannot change your own role."
              open={isSelf ? undefined : false}
            >
              <span>
                <Button
                  size="small"
                  onClick={handleSave}
                  isLoading={mutation.isPending}
                  disabled={!isDirty || isSelf}
                >
                  Save
                </Button>
              </span>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "user.details.after",
})

export default UserRoleWidget
