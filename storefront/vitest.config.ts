/**
 * vitest.config.ts — Vitest unit/integration test configuration for the storefront
 *
 * Vitest is the test runner used for all frontend tests (React components, hooks,
 * and utility functions). It's faster than Jest for ESM/TypeScript projects because
 * it shares Vite's build pipeline instead of running its own compiler.
 *
 * Key settings:
 *   environment: "jsdom" — simulates a browser DOM so React components can render in Node.js
 *   setupFiles  — runs src/test/setup.ts before each test file (clears localStorage, etc.)
 *   globals     — makes describe / it / expect available without explicit imports in test files
 *   coverage    — uses V8's built-in profiler; outputs to terminal, HTML, and lcov formats
 *   alias "@/" — maps to src/ so imports like `import { sdk } from "@/lib/medusa"` work in tests
 */

// defineConfig — Vitest's typed config factory (provides autocompletion for all options)
import { defineConfig } from "vitest/config";

// @vitejs/plugin-react — transforms JSX syntax and supports React Fast Refresh in Vite/Vitest
import react from "@vitejs/plugin-react";

// path — Node.js built-in; used here to build absolute paths for the "@/" alias
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.*",
        "src/**/*.spec.*",
        "src/app/layout.tsx",
        "src/app/backoffice/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
