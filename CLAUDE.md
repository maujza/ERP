# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aurelia is a bilingual (Spanish/Korean) jewelry e-commerce platform targeting the Argentine market. It is a monorepo with two main parts:

- **Frontend**: Next.js 16 App Router storefront (`/src`)
- **Backend**: Medusa 2.x headless commerce (`/backend`)

## Commands

### Frontend (run from repo root)

```bash
npm run dev          # local dev server (port 3000)
npm run build        # production build
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:coverage
```

### Backend (run from `/backend`)

```bash
npm run dev          # Medusa dev server (port 9000)
npm run build        # production build
npm run test:unit    # Jest unit tests (src/**/__tests__/**/*.unit.spec.ts)
npm run test:integration:modules
npm run test:integration:http
```

### Docker (full stack)

```bash
docker compose up --build web -d      # rebuild & restart frontend only
docker compose up --build backend -d  # rebuild & restart backend only
docker compose up --build -d          # rebuild everything
```

The full stack runs at: frontend → `localhost:7358`, backend → `localhost:9000`.

> **Note**: The `web` service runs a production Next.js build (no hot reload). After frontend changes, rebuild the container.

## Architecture

### Frontend (`/src`)

- **App Router pages** in `src/app/` — `checkout/page.tsx` is the most complex (full Medusa checkout flow).
- **Global state** via React Context: `cart-provider.tsx` (cart + drawer) and `language-provider.tsx` (es/ko).
- **Medusa SDK** initialized in `src/lib/medusa.ts`. Requires env vars `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_REGION_ID`.
- **Product utilities** in `src/lib/shop-data.ts`: category definitions, Spanish/Korean label translations, ARS price formatting.
- **Path alias**: `@/` → `src/`.

### Backend (`/backend/src`)

- **API routes**: `api/admin/` and `api/store/` following Medusa conventions.
- **Custom modules**: `modules/` (currently empty, ready for custom services).
- **Workflows**: `workflows/` (currently empty, ready for multi-step logic).
- **Seed scripts**: `scripts/seed-aurelia.ts` seeds the Argentina region, ARS currency, jewelry categories, 10 products, and a 10%-off promotion (`AURELIA10`). Run via `npx medusa exec ./src/scripts/seed-aurelia.ts`.
- **Custom admin UI**: `admin/routes/aurelia-dashboard/page.tsx` — sales analytics dashboard with WhatsApp notification eligibility checks.

### Medusa Config (`backend/medusa-config.ts`)

Auth uses `emailpass` for both customers and admin users. CORS origins are configured separately for store, admin, and auth endpoints.

### WhatsApp Feature

- `src/lib/whatsapp.ts` — link generation and draft persistence (localStorage).
- `backend/src/api/admin/whatsapp-notifications/route.ts` — RBAC check via `WHATSAPP_NOTIFICATION_RECIPIENTS` and `WHATSAPP_NOTIFICATION_ROLES` env vars.

## Key Conventions

- Client components are marked with `"use client"` at the top.
- The `isBackoffice` check in `SiteHeader` hides the header on `/backoffice` routes.
- Product images use `safe-image.tsx` for graceful fallbacks.
- All prices display in ARS (Argentine Peso).
- Medusa container DI pattern in API handlers: `req.scope.resolve("serviceName")`.
- Backend unit tests use the naming pattern `*.unit.spec.ts` inside `__tests__/` directories.
- Frontend tests use Vitest with jsdom; setup file at `src/test/setup.ts` clears localStorage before each test.

## gstack

Use the `/browse` skill from gstack for **all web browsing**. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:

- `/plan-ceo-review` — review a plan from a CEO/product perspective
- `/plan-eng-review` — review a plan from an engineering perspective
- `/review` — code review
- `/ship` — ship a feature end-to-end
- `/browse` — browse the web with a real browser
- `/qa` — QA a feature
- `/setup-browser-cookies` — configure browser session cookies
- `/retro` — run a retrospective

## Environment Variables

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_REGION_ID`
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE` (default: `"ar"`)

**Backend** (`.env` or Docker env):
- `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`
- `WHATSAPP_NOTIFICATION_RECIPIENTS`, `WHATSAPP_NOTIFICATION_ROLES`
- `MEDUSA_FORCE_INSECURE_COOKIES=true` for development
