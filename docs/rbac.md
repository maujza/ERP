# RBAC — Role-Based Access Control

How to create users, assign roles, and manage permissions in the Aurelia admin.

---

## How it works

Every admin user has a single role stored in `user.metadata.role` (a plain lowercase string). On every request to a protected route, the backend reads this value from the database and grants or denies access before the handler runs.

```
Request → requireRole middleware → query.graph("user", actor_id)
              ↓                              ↓
         role = "admin"?           role in allowedRoles?
              ↓ yes                        ↓ yes
            next()                       next()
              ↓ no                         ↓ no
            403 Forbidden               403 Forbidden
```

Key rules:
- `admin` always passes, regardless of what routes list as allowed roles.
- A user with **no role set** gets 403 everywhere — there is no default pass-through.
- Role is checked live on every request (no JWT caching yet).

---

## Roles

| Role | Value | What they can do |
|---|---|---|
| **Admin** | `admin` | Everything — bypasses all role checks |
| **Purchasing** | `purchasing` | Suppliers CRUD, purchase orders (create / submit / cancel / receive) |
| **Inventory** | `inventory` | View purchase orders, receive purchase orders |
| **Marketing** | `marketing` | Aurelia dashboard (no cost prices shown) |
| **Customer Service** | `customer_service` | Reserved — routes not yet implemented |

---

## Creating a new user

### In the Medusa admin UI

1. Go to **Settings → Team**.
2. Click **Invite user**.
3. Enter the email address and send the invite.
4. The user accepts the invite, sets a password, and their account is created.

> After account creation the user has **no role** and will get 403 on all purchase/dashboard routes until you assign one.

### Via API (seed scripts / CLI)

```bash
# From /backend
npx medusa user --email staff@example.com --password "change-me"
```

---

## Assigning a role

### In the Medusa admin UI (recommended)

1. Go to **Settings → Team**.
2. Click the user you want to edit.
3. Scroll to the **Role** widget at the bottom of the user detail page.
4. Select a role from the dropdown.
5. Click **Save**.

> You cannot change your own role from this widget — the Save button is disabled when you are viewing your own account.

### Via the Medusa API

```bash
curl -X POST https://your-backend/admin/users/{user_id} \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{ "metadata": { "role": "purchasing" } }'
```

Replace `{user_id}` with the user's ID (e.g. `user_01JKXYZ...`) and `"purchasing"` with any valid role value.

### Via a seed script

```ts
// backend/src/scripts/assign-role.ts
import { ExecArgs } from "@medusajs/framework/types"
import Medusa from "@medusajs/js-sdk"

export default async function ({ container }: ExecArgs) {
  const userModule = container.resolve("user")
  await userModule.updateUsers([{
    id: "user_01JKXYZ...",
    metadata: { role: "inventory" },
  }])
}
```

```bash
npx medusa exec ./src/scripts/assign-role.ts
```

---

## Removing a role

In the role widget: select **No role** from the dropdown and click **Save**.

Via API:
```bash
curl -X POST https://your-backend/admin/users/{user_id} \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{ "metadata": { "role": null } }'
```

The user will get 403 on all purchase routes immediately after the next request.

---

## Route permission matrix

| Route | Method | Allowed roles |
|---|---|---|
| `/admin/purchase/suppliers` | GET | purchasing |
| `/admin/purchase/suppliers` | POST | purchasing |
| `/admin/purchase/suppliers/:id` | GET | purchasing |
| `/admin/purchase/suppliers/:id` | POST (update) | purchasing |
| `/admin/purchase/suppliers/:id` | DELETE | purchasing |
| `/admin/purchase/orders` | GET | purchasing, inventory |
| `/admin/purchase/orders` | POST | purchasing |
| `/admin/purchase/orders/:id` | GET | purchasing, inventory |
| `/admin/purchase/orders/:id/submit` | POST | purchasing |
| `/admin/purchase/orders/:id/cancel` | POST | purchasing |
| `/admin/purchase/orders/:id/receive` | POST | purchasing, inventory |

> `admin` role always passes on all routes above.

---

## Adding a new role

1. Add the role constant to `backend/src/admin/lib/roles.ts`:

```ts
export const ROLES = {
  // ... existing roles ...
  WAREHOUSE: "warehouse",  // ← new
} as const

export const ROLE_LABELS: Record<Role, string> = {
  // ... existing labels ...
  warehouse: "Warehouse",  // ← new
}
```

2. Add `requireRole([ROLES.WAREHOUSE])` to the relevant routes in `backend/src/api/middlewares.ts`.

3. Redeploy the backend. The new role appears automatically in the admin UI role dropdown.

No other changes needed — `rbac.ts` and the widget both derive roles from `ROLES` at runtime.

---

## Adding permissions to an existing role

Open `backend/src/api/middlewares.ts` and add the role to the `allowedRoles` array for the relevant route:

```ts
// Before: only purchasing can submit orders
{ matcher: "/admin/purchase/orders/:id/submit", method: "POST",
  middlewares: [requireRole([ROLES.PURCHASING])] }

// After: purchasing + inventory can submit
{ matcher: "/admin/purchase/orders/:id/submit", method: "POST",
  middlewares: [requireRole([ROLES.PURCHASING, ROLES.INVENTORY])] }
```

Redeploy the backend. No database migration needed.

---

## WhatsApp notification eligibility

The WhatsApp notification check (`GET /admin/whatsapp-notifications`) uses a **separate** role system configured via environment variables — not `requireRole`. It reads the same `metadata.role` value but compares it against `WHATSAPP_NOTIFICATION_ROLES` (a comma-separated string in `.env`).

```bash
# .env — who receives WhatsApp order notifications
WHATSAPP_NOTIFICATION_ROLES=admin,purchasing
WHATSAPP_NOTIFICATION_RECIPIENTS=owner@example.com
```

This is independent from the route permission matrix above. A user can have WhatsApp access without route access and vice versa.

---

## Troubleshooting

**User gets 403 on a route they should have access to**
- Check their role: open their user detail page in Settings → Team and look at the Role widget.
- Verify the route is in the permission matrix above and their role is listed.
- If the role was just assigned, have them log out and back in (the check is live per-request, so a fresh login isn't strictly required, but it clears any cached session state).

**Role widget shows "Save" as always disabled**
- You are looking at your own account. You cannot change your own role. Ask another admin to change it.

**User has a role set but still gets 403**
- Confirm the role value in the database matches exactly one of the values in the table above (lowercase, underscores). A value like `"Purchasing"` (capital P) is normalized on read, but `"purchase"` (wrong key) would be rejected.
- Check backend logs for any startup errors that might indicate the `rbac.ts` module failed to load.
