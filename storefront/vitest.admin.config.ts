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
    include: ["../backend/src/admin/**/*.spec.{ts,tsx}"],
    server: {
      deps: {
        // Inline these packages through Vite's transform pipeline so the
        // react/react-dom aliases above apply to their internal imports too.
        // Without this, pre-bundled CJS modules import React from their own
        // node_modules and cause "multiple React instances" failures.
        // @testing-library/react + react-dom MUST be inlined too, otherwise the
        // pre-bundled RTL imports react-dom/client from the root (React 19) and
        // bypasses the alias, rendering React-18 elements with a React-19 DOM.
        inline: [
          "@tanstack/react-query",
          "@medusajs/ui",
          "@medusajs/admin-sdk",
          "@testing-library/react",
          "react-dom",
        ],
      },
    },
  },
  server: {
    fs: {
      // The admin specs and their @medusajs deps live in ../backend, outside
      // this Vite root (storefront/). Allow Vite to read from the repo root so
      // these out-of-root source files can be transformed and served.
      allow: [path.resolve(__dirname, "..")],
    },
  },
  // Force these packages through Vite's SSR transform instead of native Node
  // externalization. Externalized node_modules bypass resolve.alias entirely,
  // so @testing-library/react would import react-dom/client from the root
  // (React 19) and render the backend's React-18 elements with a React-19 DOM
  // ("A React Element from an older version of React was rendered"). noExternal
  // routes their imports back through the aliases below → one React instance.
  ssr: {
    noExternal: [
      "@testing-library/react",
      "@testing-library/dom",
      "@tanstack/react-query",
      "@medusajs/ui",
      "@medusajs/admin-sdk",
      "react-dom",
      "react",
    ],
  },
  resolve: {
    // Force a single physical copy of React across every tree. The repo has
    // three node_modules trees: storefront (React 19), ../backend (React 18),
    // and the repo root ../node_modules (React 19 + @testing-library/react).
    // @testing-library/react only exists at the root (React 19), so the whole
    // render tree must be pinned to that root copy — using the storefront or
    // backend copy leaves react-dom resolving to the root anyway, producing two
    // distinct React instances and a null hook dispatcher
    // ("Cannot read properties of null (reading 'useEffect')").
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
    alias: [
      // Pin react + react-dom (and their subpaths) to the repo-root React 19
      // copy so every package (widget, react-query, @testing-library/react)
      // shares one React instance. The subpath regex aliases (jsx-runtime,
      // react-dom/client) MUST come first — a plain string `find: "react-dom"`
      // does not reliably rewrite `react-dom/client`, which is what RTL imports.
      { find: /^react-dom\/(.*)$/, replacement: path.resolve(__dirname, "../node_modules/react-dom") + "/$1" },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, "../node_modules/react-dom") },
      { find: /^react\/(.*)$/, replacement: path.resolve(__dirname, "../node_modules/react") + "/$1" },
      { find: /^react$/, replacement: path.resolve(__dirname, "../node_modules/react") },
      // Resolve Medusa + React-Query from the backend's node_modules.
      { find: "@medusajs/admin-sdk", replacement: path.resolve(__dirname, "../backend/node_modules/@medusajs/admin-sdk") },
      { find: "@medusajs/types", replacement: path.resolve(__dirname, "../backend/node_modules/@medusajs/types") },
      { find: "@medusajs/ui", replacement: path.resolve(__dirname, "../backend/node_modules/@medusajs/ui") },
      { find: "@tanstack/react-query", replacement: path.resolve(__dirname, "../backend/node_modules/@tanstack/react-query") },
    ],
  },
})
