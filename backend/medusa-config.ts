/**
 * medusa-config.ts — Main Medusa 2.x backend configuration
 *
 * This is the wiring file Medusa reads at startup. It registers:
 *   - Custom modules: purchaseDepartment, taskBoard, image-upload (Cloudflare R2)
 *   - Third-party integrations: SendGrid (email fallback), Cloudflare R2 (file storage)
 *   - Database URL, CORS allowed origins, auth providers, and cookie settings
 *
 * "Modules" in Medusa are self-contained packages of business logic + database models.
 * Each entry in `modules[]` tells Medusa where to find the module's index.ts.
 *
 * Environment variables are loaded from .env by `loadEnv` before anything else runs.
 * See .env.example for the full list of required and optional variables.
 */

// loadEnv — reads .env (or .env.development / .env.production) and merges vars into process.env
// defineConfig — typed factory for Medusa's config object; validates required fields at startup
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

// Load environment variables from the .env file before any process.env access below
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// In development, cookies can't be marked `secure` because the site runs over http://
// Set MEDUSA_FORCE_INSECURE_COOKIES=true in .env to allow cookies over plain http
const forceInsecureCookies = process.env.MEDUSA_FORCE_INSECURE_COOKIES === "true"

// Cloudflare R2 is only registered as the file provider when R2_BUCKET is set.
// If the env var is missing (e.g., local dev without R2), Medusa falls back to
// its default local file storage — no crash, just no cloud uploads.
const r2FileModule = process.env.R2_BUCKET
  ? {
      // "@medusajs/medusa/file" is Medusa's built-in file module — we override its provider
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            // Points to our custom R2 provider class in src/modules/image-upload/
            resolve: "./src/modules/image-upload",
            id: "r2",
            options: {
              bucket: process.env.R2_BUCKET,            // R2 bucket name
              endpoint: process.env.R2_ENDPOINT,        // https://<account-id>.r2.cloudflarestorage.com
              publicUrl: process.env.R2_PUBLIC_URL,     // Public CDN URL (https://pub-xxx.r2.dev)
              accessKeyId: process.env.R2_ACCESS_KEY_ID,
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
          },
        ],
      },
    }
  : null

module.exports = defineConfig({
  modules: [
    // Custom purchase department module: suppliers, purchase orders, fulfillment records
    { resolve: "./src/modules/purchaseDepartment" },
    // Custom task board module: team task management (kanban-style)
    { resolve: "./src/modules/taskBoard" },
    // Cloudflare R2 file provider — only included when R2_BUCKET env var is set
    ...(r2FileModule ? [r2FileModule] : []),
    {
      // Medusa's built-in notification module — handles email, SMS, in-app feeds
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            // SendGrid provider — used as a fallback if Resend is not configured
            // Primary email sending is done directly via Resend in invite-created.ts
            resolve: "@medusajs/notification-sendgrid",
            id: "sendgrid",
            options: {
              channels: ["email"],
              api_key: process.env.SENDGRID_API_KEY,
              from: process.env.SENDGRID_FROM,
            },
          },
        ],
      },
    },
  ],
  projectConfig: {
    // PostgreSQL connection string — see DATABASE_URL in .env.example
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // CORS: comma-separated lists of origins allowed to make requests to each endpoint group
      // storeCors — origins allowed to access public store APIs (the Next.js storefront)
      storeCors: process.env.STORE_CORS!,
      // adminCors — origins allowed to access admin APIs (the Medusa admin UI)
      adminCors: process.env.ADMIN_CORS!,
      // authCors — origins allowed to hit auth endpoints (login, token refresh)
      authCors: process.env.AUTH_CORS!,
      // authMethodsPerActor — which login method each actor type uses
      // "emailpass" means username + password (as opposed to OAuth/SSO)
      authMethodsPerActor: {
        customer: ["emailpass"],
        user: ["emailpass"],
      },
      // JWT_SECRET signs session tokens — must be a long random string in production
      jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET env var is required") })(),
      // COOKIE_SECRET signs session cookies — must be a long random string in production
      cookieSecret: process.env.COOKIE_SECRET ?? (() => { throw new Error("COOKIE_SECRET env var is required") })(),
    },
    // In development (http://), disable the `secure` and `sameSite=strict` cookie flags
    // so the browser accepts cookies over plain http. Never use this in production.
    cookieOptions: forceInsecureCookies
      ? {
          secure: false,
          sameSite: "lax",
        }
      : undefined,
  }
})
