import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  EllipsisHorizontal,
  PencilSquare,
  Trash,
  Users,
} from "@medusajs/icons"
import {
  Button,
  Container,
  DataTable,
  DataTablePaginationState,
  Drawer,
  DropdownMenu,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Prompt,
  Text,
  createDataTableColumnHelper,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../../lib/client"

type Supplier = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
}

type SupplierForm = {
  name: string
  email: string
  phone: string
  address: string
  notes: string
}

const columnHelper = createDataTableColumnHelper<Supplier>()

const SuppliersPage = () => {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: 15,
  })
  const [createForm, setCreateForm] = useState<SupplierForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })
  const [editForm, setEditForm] = useState<SupplierForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })

  const limit = pagination.pageSize
  const offset = pagination.pageIndex * limit

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", limit, offset],
    queryFn: () =>
      sdk.client.fetch<{ suppliers: Supplier[]; count: number }>(
        "/admin/purchase/suppliers",
        { query: { limit, offset } }
      ),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      sdk.client.fetch("/admin/purchase/suppliers", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Supplier created")
      setCreateOpen(false)
      setCreateForm({ name: "", email: "", phone: "", address: "", notes: "" })
    },
    onError: () => toast.error("Failed to create supplier"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) =>
      sdk.client.fetch(`/admin/purchase/suppliers/${id}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Supplier updated")
      setEditSupplier(null)
    },
    onError: () => toast.error("Failed to update supplier"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/purchase/suppliers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Supplier deleted")
    },
    onError: () => toast.error("Failed to delete supplier"),
  })

  const openEdit = (supplier: Supplier) => {
    setEditForm({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    })
    setEditSupplier(supplier)
  }

  const handleCreate = () => {
    if (!createForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    createMutation.mutate({
      name: createForm.name,
      email: createForm.email || null,
      phone: createForm.phone || null,
      address: createForm.address || null,
      notes: createForm.notes || null,
    })
  }

  const handleUpdate = () => {
    if (!editSupplier) return
    if (!editForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    updateMutation.mutate({
      id: editSupplier.id,
      name: editForm.name,
      email: editForm.email || null,
      phone: editForm.phone || null,
      address: editForm.address || null,
      notes: editForm.notes || null,
    })
  }

  const columns = [
    columnHelper.accessor("name", { header: "Name" }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: ({ getValue }) => getValue() || "—",
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
      cell: ({ getValue }) => getValue() || "—",
    }),
    columnHelper.accessor("address", {
      header: "Address",
      cell: ({ getValue }) => getValue() || "—",
    }),
    columnHelper.accessor("created_at", {
      header: "Created",
      cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton size="small" variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => openEdit(row.original)}
            >
              <PencilSquare className="text-ui-fg-subtle" />
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <Prompt>
              <Prompt.Trigger asChild>
                <DropdownMenu.Item
                  className="gap-x-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash className="text-ui-fg-subtle" />
                  Delete
                </DropdownMenu.Item>
              </Prompt.Trigger>
              <Prompt.Content>
                <Prompt.Header>
                  <Prompt.Title>Delete Supplier</Prompt.Title>
                  <Prompt.Description>
                    Are you sure you want to delete{" "}
                    <strong>{row.original.name}</strong>? This action cannot be
                    undone.
                  </Prompt.Description>
                </Prompt.Header>
                <Prompt.Footer>
                  <Prompt.Cancel>Cancel</Prompt.Cancel>
                  <Prompt.Action
                    onClick={() => deleteMutation.mutate(row.original.id)}
                  >
                    Delete
                  </Prompt.Action>
                </Prompt.Footer>
              </Prompt.Content>
            </Prompt>
          </DropdownMenu.Content>
        </DropdownMenu>
      ),
    }),
  ]

  const table = useDataTable({
    data: data?.suppliers || [],
    columns,
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Suppliers</Heading>
        <Button size="small" onClick={() => setCreateOpen(true)}>
          New Supplier
        </Button>
      </div>

      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      {/* Create FocusModal */}
      <FocusModal open={createOpen} onOpenChange={setCreateOpen}>
        <FocusModal.Content>
          <div className="flex h-full flex-col overflow-hidden">
            <FocusModal.Header>
              <div className="flex items-center justify-end gap-x-2">
                <FocusModal.Close asChild>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                </FocusModal.Close>
                <Button
                  size="small"
                  onClick={handleCreate}
                  isLoading={createMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body className="flex-1 overflow-auto p-6">
              <div className="mx-auto max-w-lg">
                <Heading className="mb-6">New Supplier</Heading>
                <SupplierFormFields form={createForm} onChange={setCreateForm} />
              </div>
            </FocusModal.Body>
          </div>
        </FocusModal.Content>
      </FocusModal>

      {/* Edit Drawer */}
      <Drawer
        open={!!editSupplier}
        onOpenChange={(open) => !open && setEditSupplier(null)}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Supplier</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex-1 overflow-auto p-6">
            <SupplierFormFields form={editForm} onChange={setEditForm} />
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                onClick={handleUpdate}
                isLoading={updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

function SupplierFormFields({
  form,
  onChange,
}: {
  form: SupplierForm
  onChange: (v: SupplierForm) => void
}) {
  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Supplier name"
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          placeholder="contact@supplier.com"
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          placeholder="+1 234 567 8900"
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
          placeholder="123 Main St, City"
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder="Additional notes..."
        />
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Suppliers",
  icon: Users,
})

export default SuppliersPage
