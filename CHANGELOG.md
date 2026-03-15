# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-03-15

### Added
- **Purchase Department module**: full order lifecycle for suppliers and purchase orders — create, submit, cancel, receive (with Medusa inventory update)
- **RBAC middleware** (`backend/src/lib/rbac.ts`): role-based access control on all admin routes; roles stored in `user.metadata.role`; `admin` bypasses all checks; no-role users receive 403
- **Role constants** (`backend/src/admin/lib/roles.ts`): shared between backend middleware and admin UI Vite bundle; roles: `admin`, `purchasing`, `inventory`, `marketing`, `customer_service`
- **Role assignment widget** in Medusa admin user detail page; prevents self-demotion
- **Invite email subscriber**: sends SendGrid email via Medusa Notification module when a user is invited or re-invited; email contains a one-click accept link
- **Policy snapshot tests** (`middlewares-policy.unit.spec.ts`): verifies RBAC route configuration is correct at the config layer, not just the logic layer
- **RBAC documentation** (`docs/rbac.md`): full guide covering roles, route matrix, user creation, role assignment, troubleshooting
- **`.env.example`**: documents all required environment variables for Docker deployment
- **TODOS.md**: full ERP roadmap — 5 sprints from purchase module to WhatsApp platform and Easy Inventory OCR
- **gstack skill references** added to CLAUDE.md

### Changed
- Docker-compose env vars externalized — no hardcoded domains; all configurable via `.env`
- ROLES constants moved to `admin/lib/roles.ts` so both the backend and the admin Vite bundle can import them without circular dependencies
- Seed script now assigns `metadata.role: "admin"` to the initial admin user

### Fixed
- Medusa admin routes (`/admin/users*`, `/admin/invites*`, etc.) that opt out of global `authMiddleware` are no longer wrapped by `requireRole` — this was causing login failures and 401s on all admin API calls
- `requireRole` null-guards `auth_context` before accessing `actor_id` to prevent crashes on unauthenticated requests
- TypeScript return-type errors in `requireRole`: `res.status(N).json()` returns `MedusaResponse`, not `void`; fixed by separating the call from the `return` statement
