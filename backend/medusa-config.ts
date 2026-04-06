import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const forceInsecureCookies = process.env.MEDUSA_FORCE_INSECURE_COOKIES === "true"

module.exports = defineConfig({
  modules: [
    { resolve: "./src/modules/purchaseDepartment" },
    { resolve: "./src/modules/taskBoard" },
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
