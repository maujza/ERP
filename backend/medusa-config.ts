import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const forceInsecureCookies = process.env.MEDUSA_FORCE_INSECURE_COOKIES === "true"

const r2FileModule = process.env.R2_BUCKET
  ? {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/image-upload",
            id: "r2",
            options: {
              bucket: process.env.R2_BUCKET,
              endpoint: process.env.R2_ENDPOINT,
              publicUrl: process.env.R2_PUBLIC_URL,
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
    { resolve: "./src/modules/purchaseDepartment" },
    { resolve: "./src/modules/taskBoard" },
    ...(r2FileModule ? [r2FileModule] : []),
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
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
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      authMethodsPerActor: {
        customer: ["emailpass"],
        user: ["emailpass"],
      },
      jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET env var is required") })(),
      cookieSecret: process.env.COOKIE_SECRET ?? (() => { throw new Error("COOKIE_SECRET env var is required") })(),
    },
    cookieOptions: forceInsecureCookies
      ? {
          secure: false,
          sameSite: "lax",
        }
      : undefined,
  }
})
