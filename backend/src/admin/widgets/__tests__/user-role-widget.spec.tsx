import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"
import UserRoleWidget from "../user-role-widget"

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../lib/client", () => ({
  sdk: {
    admin: {
      user: {
        me: vi.fn(),
        update: vi.fn(),
      },
    },
  },
}))

// Mock @medusajs/ui with plain HTML — avoids pulling @radix-ui from
// backend/node_modules into the root Vitest context (multi-React conflict).
vi.mock("@medusajs/ui", () => {
  const toast = { success: vi.fn(), error: vi.fn() }

  const Select = ({ value, onValueChange, disabled, children }: {
    value: string
    onValueChange: (v: string) => void
    disabled?: boolean
    children?: React.ReactNode
  }) => (
    <select
      role="combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  )
  Select.Trigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  Select.Value = () => null
  Select.Content = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  Select.Item = ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  )

  const Button = ({ children, onClick, disabled, isLoading }: {
    children?: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    isLoading?: boolean
  }) => (
    <button onClick={onClick} disabled={disabled || isLoading}>
      {children}
    </button>
  )

  const Tooltip = ({ children, content }: {
    children?: React.ReactNode
    content?: string
  }) => <span title={content ?? ""}>{children}</span>

  const TooltipProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  const Container = ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>
  const Heading = ({ children, level, className }: { children?: React.ReactNode; level?: string; className?: string }) => <h2 className={className}>{children}</h2>
  const Text = ({ children, size, className }: { children?: React.ReactNode; size?: string; className?: string }) => <p className={className}>{children}</p>

  return { Select, Button, Container, Heading, Text, Tooltip, TooltipProvider, toast }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { sdk } from "../../lib/client"
import { toast } from "@medusajs/ui"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AdminUser } from "@medusajs/types"

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "user_target",
    email: "target@example.com",
    first_name: null,
    last_name: null,
    avatar_url: null,
    metadata: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  }
}

function renderWidget(user: AdminUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <UserRoleWidget data={user} />
    </QueryClientProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  ;(sdk.admin.user.me as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user_me" },
  })
  ;(sdk.admin.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: makeUser(),
  })
})

describe("UserRoleWidget — rendering", () => {
  it("shows 'No role' option when user has no metadata.role", () => {
    renderWidget(makeUser({ metadata: null }))
    expect(screen.getByRole("combobox")).toBeInTheDocument()
    expect(screen.getByText("No role")).toBeInTheDocument()
  })

  it("pre-selects the current role when metadata.role is set", () => {
    renderWidget(makeUser({ metadata: { role: "purchasing" } }))
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("purchasing")
  })

  it("renders all 5 role options in the dropdown", () => {
    renderWidget(makeUser())
    expect(screen.getByText("Admin")).toBeInTheDocument()
    expect(screen.getByText("Inventory")).toBeInTheDocument()
    expect(screen.getByText("Purchasing")).toBeInTheDocument()
    expect(screen.getByText("Marketing")).toBeInTheDocument()
    expect(screen.getByText("Customer Service")).toBeInTheDocument()
  })

  it("Save button is disabled when no change has been made", () => {
    renderWidget(makeUser({ metadata: { role: "purchasing" } }))
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
  })
})

describe("UserRoleWidget — self-demotion guard", () => {
  it("disables the Save button when the target user is the current user", async () => {
    ;(sdk.admin.user.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "user_target" },
    })
    renderWidget(makeUser({ id: "user_target" }))
    // Change selection to something different to ensure it's not just the
    // "no change" guard triggering the disable.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "admin" } })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    })
  })

  it("does NOT disable Save when the target is a different user (after me() resolves)", async () => {
    ;(sdk.admin.user.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "user_me" },
    })
    renderWidget(makeUser({ id: "user_target", metadata: null }))
    // Button starts disabled (isSelf defaults to true until me() resolves).
    // After me() returns a different user id, the guard lifts.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "purchasing" } })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled()
    })
  })
})

// Helper: change the dropdown and wait for the Save button to become enabled.
// Required because isSelf defaults to true until me() resolves, so the button
// is initially disabled even for a different target user.
async function selectRoleAndEnableSave(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } })
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled()
  })
}

describe("UserRoleWidget — save mutation", () => {
  it("calls sdk.admin.user.update with the selected role", async () => {
    renderWidget(makeUser({ metadata: null }))
    await selectRoleAndEnableSave("inventory")
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(sdk.admin.user.update).toHaveBeenCalledWith("user_target", {
        metadata: { role: "inventory" },
      })
    })
  })

  it("calls sdk.admin.user.update with null when 'No role' is selected", async () => {
    renderWidget(makeUser({ metadata: { role: "purchasing" } }))
    await selectRoleAndEnableSave("__none__")
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(sdk.admin.user.update).toHaveBeenCalledWith("user_target", {
        metadata: { role: null },
      })
    })
  })

  it("shows a success toast on successful save", async () => {
    renderWidget(makeUser({ metadata: null }))
    await selectRoleAndEnableSave("admin")
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Role updated")
    })
  })

  it("shows an error toast when the mutation fails", async () => {
    ;(sdk.admin.user.update as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("500")
    )
    renderWidget(makeUser({ metadata: null }))
    await selectRoleAndEnableSave("admin")
    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update role")
    })
  })
})
