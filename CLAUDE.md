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

- **App Router pages** in `src/app/` — routes include product pages, checkout, search, catalog, and account/auth.
  - **Checkout** (`src/app/checkout/`) — decomposed into focused sub-components:
    - `page.tsx` — orchestrates the full flow
    - `use-checkout.ts` — custom hook with state management
    - `contact-form.tsx`, `shipping-form.tsx`, `payment-method-picker.tsx` — form segments
    - `checkout-choice-modal.tsx`, `order-summary.tsx`, `field.tsx` — UI components
    - `types.ts`, `translations.ts` — types and i18n strings
- **Components** in `src/components/`:
  - `cart-provider.tsx` — global cart state and cart context
  - `cart-drawer.tsx` — drawer UI for viewing cart
  - `product-card.tsx` — reusable product display component
  - `quantity-selector.tsx` — quantity picker UI
  - `language-provider.tsx` — i18n context (es/ko)
  - `safe-image.tsx` — graceful image fallbacks
- **Medusa SDK** initialized in `src/lib/medusa.ts`. Requires env vars `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_REGION_ID`.
- **Product utilities** in `src/lib/shop-data.ts`: category definitions, Spanish/Korean label translations, ARS price formatting.
- **Path alias**: `@/` → `src/`.
- **Tests**: Vitest with jsdom; 579+ tests; setup clears localStorage before each test.

### Backend (`/backend/src`)

- **API routes**:
  - `api/admin/` — admin endpoints for purchase orders, suppliers, fulfillment, KPIs
  - `api/store/` — storefront endpoints including order notifications
  - Following Medusa conventions with container DI pattern
- **Custom modules**: `modules/purchaseDepartment/` — supplier, purchase order, and fulfillment management with write-time cached `fill_rate`
- **Workflows**:
  - `create-supplier`, `update-supplier` — supplier lifecycle
  - `receive-purchase-order`, `create-purchase-order` — PO management
  - `startPickingWorkflow`, `confirmPackWorkflow`, `dispatchOrderWorkflow` — fulfillment steps
- **Database models**: `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `FulfillmentRecord`, `StockAdjustmentLog` with proper migrations
- **Subscribers**:
  - `low-stock-check.ts` — monitors stock levels
  - `order-placed.ts` — handles new order events
- **Jobs**: `packed-not-shipped.ts` — background job for order status monitoring
- **Utilities**:
  - `lib/rbac.ts` — role-based access control
  - `lib/notification-recipients.ts` — helper for WhatsApp notification eligibility
- **Seed scripts**:
  - `seed-aurelia.ts` — seeds Argentina region, ARS currency, jewelry categories, 10 products, 10%-off promotion (`AURELIA10`)
  - `seed-demo-historic.ts` — demo data for testing
  - `cleanup-seeded-orders.ts` — cleanup utility
  - `reset-demo-data.ts` — reset utility
- **Custom admin UI**: `admin/routes/aurelia-dashboard/page.tsx` — sales analytics dashboard with WhatsApp notification eligibility checks
- **Tests**: Jest with 172+ unit tests; pattern: `*.unit.spec.ts` inside `__tests__/` directories

### Medusa Config (`backend/medusa-config.ts`)

Auth uses `emailpass` for both customers and admin users. CORS origins are configured separately for store, admin, and auth endpoints.

### WhatsApp Feature

- `src/lib/whatsapp.ts` — link generation and draft persistence (localStorage).
- `backend/src/api/admin/whatsapp-notifications/route.ts` — RBAC check via `WHATSAPP_NOTIFICATION_RECIPIENTS` and `WHATSAPP_NOTIFICATION_ROLES` env vars.

## Key Conventions

- **Client components** marked with `"use client"` at the top.
- **Backoffice routing**: `isBackoffice` check in `SiteHeader` hides header on `/backoffice` routes.
- **Product images**: use `safe-image.tsx` for graceful fallbacks.
- **Pricing**: all prices display in ARS (Argentine Peso).
- **Medusa container DI**: API handlers use `req.scope.resolve("serviceName")`.
- **Backend testing**: Jest unit tests use `*.unit.spec.ts` inside `__tests__/` directories; module-level caches export `clearX()` functions called in `beforeEach`
- **Frontend testing**: Vitest with jsdom; setup at `src/test/setup.ts` clears localStorage before each test.
- **Immutability**: follow immutable data patterns (never mutate objects in-place).
- **Component organization**: files under 800 lines; extract utilities and reusable components.
- **i18n**: bilingual (Spanish/Korean) via `useLanguage` hook and `t` translation object; product metadata fields `name_ko`/`description_ko` for Korean names.

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

<!-- AUTO-GENERATED: Last updated from .env.example -->

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — backend API URL
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — Medusa storefront publishable key
- `NEXT_PUBLIC_MEDUSA_REGION_ID` — region identifier
- `NEXT_PUBLIC_MEDUSA_COUNTRY_CODE` — country code (default: `"ar"`)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — WhatsApp business number for order notifications
- `NEXT_PUBLIC_SHIPPING_STANDARD_ARS` — standard shipping cost in ARS (e.g., 3900)
- `NEXT_PUBLIC_SHIPPING_EXPRESS_ARS` — express shipping cost in ARS (e.g., 7200)

**Backend** (`.env` or Docker env):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret for JWT signing (required)
- `COOKIE_SECRET` — secret for session cookies (required)
- `MEDUSA_FORCE_INSECURE_COOKIES` — `true` for development (allows http cookies)
- `STORE_CORS` — comma-separated CORS origins for storefront
- `ADMIN_CORS` — comma-separated CORS origins for admin UI
- `AUTH_CORS` — comma-separated CORS origins for auth endpoints
- `MEDUSA_ADMIN_EMAIL` — admin user email (default: `admin@aurelia.com`)
- `MEDUSA_ADMIN_PASSWORD` — admin user password (required)
- `MEDUSA_ADMIN_URL` — admin UI URL (used in invite emails)
- `SENDGRID_API_KEY` — SendGrid API key for email delivery
- `SENDGRID_FROM` — SendGrid sender email address
- `WHATSAPP_NOTIFICATION_RECIPIENTS` — comma-separated admin emails eligible for WhatsApp notifications
- `WHATSAPP_NOTIFICATION_ROLES` — comma-separated roles eligible for WhatsApp notifications

<!-- AUTO-GENERATED END -->
