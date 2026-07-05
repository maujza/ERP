import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    // The admin login flow stores the JWT returned by /auth/user/emailpass.
    // Using session auth here drops that token on follow-up admin requests,
    // which sends the UI back to /app/login after a successful sign-in.
    type: "jwt",
  },
})
