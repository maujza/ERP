import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

// Vitest config for Medusa admin widget tests.
// Runs separately from the backend Jest suite (which covers API + workflows)
// and from the frontend Vitest suite (which covers Next.js pages).
//
// Run with: npm run test:admin

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["backend/src/admin/**/*.spec.{ts,tsx}"],
    server: {
      deps: {
        // Inline these packages through Vite's transform pipeline so the
        // react/react-dom aliases above apply to their internal imports too.
        // Without this, pre-bundled CJS modules import React from their own
        // node_modules and cause "multiple React instances" failures.
        inline: ["@tanstack/react-query", "@medusajs/ui", "@medusajs/admin-sdk"],
      },
    },
  },
  resolve: {
    // Force a single copy of React across the root package and
    // backend/node_modules (where @medusajs/ui lives). Without this,
    // two React instances render in the same test and throw
    // "A React Element from an older version of React was rendered."
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
    alias: [
      // Pin react + react-dom to the root copies so every package
      // (including those resolved from backend/node_modules) shares a single
      // React instance and avoids "older version of React" / null hook errors.
      { find: "react", replacement: path.resolve(__dirname, "node_modules/react") },
      { find: "react-dom", replacement: path.resolve(__dirname, "node_modules/react-dom") },
      // Resolve Medusa + React-Query from the backend's node_modules.
      { find: "@medusajs/admin-sdk", replacement: path.resolve(__dirname, "backend/node_modules/@medusajs/admin-sdk") },
      { find: "@medusajs/types", replacement: path.resolve(__dirname, "backend/node_modules/@medusajs/types") },
      { find: "@medusajs/ui", replacement: path.resolve(__dirname, "backend/node_modules/@medusajs/ui") },
      { find: "@tanstack/react-query", replacement: path.resolve(__dirname, "backend/node_modules/@tanstack/react-query") },
    ],
  },
})
